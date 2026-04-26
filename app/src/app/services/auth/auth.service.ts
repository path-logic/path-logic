import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { User } from 'firebase/auth';
import {
    getRedirectResult,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithRedirect,
    signOut
} from 'firebase/auth';

import { environment } from '../../../environments/environment';
import { FirebaseService } from '../firebase/firebase.service';
import { PostHogService } from '../posthog/posthog.service';

/** LocalStorage key prefix for the persisted Google OAuth token. */
const TOKEN_KEY = (uid: string): string => `pl_gdtoken_${uid}`;

/**
 * Google OAuth tokens last 60 minutes. We treat them as stale at 55 min
 * so we never attempt a Drive call with an expired token.
 */
const TOKEN_TTL_MS = 55 * 60 * 1000;

interface IStoredToken {
    token: string;
    expiresAt: number;
}

/**
 * AuthService wraps Firebase Authentication with Angular signals.
 *
 * ## Sign-in Flow (Redirect, not Popup)
 *
 * We use signInWithRedirect() instead of signInWithPopup() because Chrome
 * and Firefox enforce Cross-Origin-Opener-Policy (COOP) on Google's OAuth
 * popup domain (accounts.google.com), which prevents the popup from
 * signaling back to the opener — causing a permanent hang.
 *
 * Redirect flow:
 *   1. User clicks "Continue with Google"
 *   2. signInWithRedirect() — browser navigates to accounts.google.com
 *   3. User authenticates on Google
 *   4. Browser redirects back to our app (at /sign-in)
 *   5. Both getRedirectResult() and onAuthStateChanged run concurrently.
 *      isInitializing stays true until BOTH have resolved.
 *   6. onAuthStateChanged fires with the authenticated user
 *   7. getRedirectResult() resolves with the credential → token stored
 *   8. AppComponent begins local-first init and navigates to /
 *
 * ## Why isInitializing waits for getRedirectResult()
 *
 * After a redirect, Firebase fires onAuthStateChanged TWICE:
 *   - First with null (the previous logged-out state)
 *   - Then with the authenticated user (after processing the redirect)
 *
 * If isInitializing flips to false on the FIRST (null) callback, the
 * navigation effect fires and stays on /sign-in. By keeping isInitializing
 * true until getRedirectResult() resolves, we ensure the navigation effect
 * only acts on the final auth state.
 *
 * ## Token Persistence
 *
 * Google OAuth tokens are persisted in localStorage with a 55-minute TTL.
 * On page refresh, the stored token is restored in onAuthStateChanged so
 * AppComponent can take the full Drive sync path without re-prompting.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly firebase = inject(FirebaseService);
    private readonly router = inject(Router);
    private readonly posthogService = inject(PostHogService);

    /** Internal Firebase user signal */
    private readonly _user = signal<User | null | undefined>(undefined);

    /** The current Firebase user (null = not logged in, undefined = still loading) */
    readonly currentUser = computed(() => this._user());

    /** Whether the user is currently logged in. */
    readonly isLoggedIn = computed((): boolean => environment.e2e === true || !!this.currentUser());

    /**
     * True until BOTH onAuthStateChanged AND getRedirectResult() have resolved.
     * Prevents the navigation effect from acting on the intermediate null state
     * that Firebase emits before processing the redirect result.
     */
    readonly isInitializing = signal<boolean>(!environment.e2e);

    /** The Google OAuth access token for Drive API calls. */
    readonly accessToken = signal<string | null>(null);

    /** The user's Firebase UID. */
    readonly userId = computed((): string | null => this.currentUser()?.uid ?? null);

    /** Whether a redirect result is currently being processed. */
    private redirectResultPending = true;

    constructor() {
        // Skip Firebase auth in E2E test mode
        if (environment.e2e) {
            return;
        }

        // Process redirect result FIRST (async, fire-and-forget).
        // Sets redirectResultPending = false when done, then re-evaluates isInitializing.
        void this.handleRedirectResult();

        // Listen for auth state changes (fires immediately with cached state)
        onAuthStateChanged(
            this.firebase.auth,
            (user: User | null): void => {
                this._user.set(user);

                // Only mark initialization complete once redirect result has also resolved.
                // This prevents the navigation effect from acting on the intermediate
                // null callback Firebase emits before processing the redirect credential.
                if (!this.redirectResultPending) {
                    this.isInitializing.set(false);
                }

                if (user) {
                    const cached = this.restoreStoredToken(user.uid);
                    if (cached) {
                        this.accessToken.set(cached);
                        console.info('[AuthService] Restored cached Google token from localStorage');
                    } else {
                        console.info(
                            '[AuthService] No valid cached token — waiting for redirect result or re-auth'
                        );
                    }
                }
            },
            error => {
                console.error('[AuthService] Fatal error inside onAuthStateChanged:', error);
            }
        );

        // Redirect to sign-in when auth resolves with no session
        effect((): void => {
            const user: User | null | undefined = this.currentUser();
            const initializing = this.isInitializing();
            if (initializing || user === undefined) return; // still loading
            if (!user) {
                void this.router.navigate(['/sign-in']);
            } else if (this.router.url === '/sign-in') {
                void this.router.navigate(['/']);
            }
        });
    }

    /**
     * Initiates the Google sign-in redirect flow.
     * The browser navigates to accounts.google.com — no popup, no COOP issues.
     * When Google redirects back, handleRedirectResult() picks up the credential.
     */
    async signInWithGoogle(): Promise<void> {
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/drive.appdata');
        await signInWithRedirect(this.firebase.auth, provider);
    }

    async signOut(): Promise<void> {
        this.posthogService.posthog.capture('user_signed_out');
        this.posthogService.posthog.reset();

        const uid = this.userId();
        if (uid) this.clearStoredToken(uid);

        await signOut(this.firebase.auth);
        this.accessToken.set(null);
    }

    // ── Redirect result handler ───────────────────────────────────────────────

    /**
     * Called on every app startup to pick up the credential from a previous
     * signInWithRedirect() call.
     *
     * Keeps redirectResultPending = true while awaiting so that the
     * onAuthStateChanged handler knows not to finalize isInitializing yet.
     * Once resolved (with or without a result), marks the redirect as done
     * and finalizes isInitializing if auth has also resolved.
     */
    private async handleRedirectResult(): Promise<void> {
        try {
            const result = await getRedirectResult(this.firebase.auth);

            if (result) {
                const credential = GoogleAuthProvider.credentialFromResult(result);
                if (credential?.accessToken) {
                    this.accessToken.set(credential.accessToken);
                    this.storeToken(result.user.uid, credential.accessToken);
                    console.info('[AuthService] Google redirect sign-in complete, token stored');
                }
                this.posthogService.posthog.identify(result.user.uid, {
                    email: result.user.email ?? undefined,
                    name: result.user.displayName ?? undefined
                });
                this.posthogService.posthog.capture('user_signed_in', { provider: 'google' });
            } else {
                console.info('[AuthService] No pending redirect result (normal startup)');
            }
        } catch (error: unknown) {
            console.warn('[AuthService] getRedirectResult error (non-fatal):', error);
        } finally {
            // Redirect result is resolved — allow isInitializing to complete.
            this.redirectResultPending = false;

            // If onAuthStateChanged already fired (user is set or null, not undefined),
            // we can now finalize isInitializing.
            if (this._user() !== undefined) {
                this.isInitializing.set(false);
            }
        }
    }

    // ── Token persistence ─────────────────────────────────────────────────────

    private storeToken(uid: string, token: string): void {
        try {
            const payload: IStoredToken = { token, expiresAt: Date.now() + TOKEN_TTL_MS };
            localStorage.setItem(TOKEN_KEY(uid), JSON.stringify(payload));
        } catch {
            // localStorage may be full or blocked (private browsing) — non-fatal
        }
    }

    private restoreStoredToken(uid: string): string | null {
        try {
            const raw = localStorage.getItem(TOKEN_KEY(uid));
            if (!raw) return null;
            const { token, expiresAt } = JSON.parse(raw) as IStoredToken;
            if (Date.now() >= expiresAt) {
                localStorage.removeItem(TOKEN_KEY(uid));
                return null; // expired
            }
            return token;
        } catch {
            return null;
        }
    }

    private clearStoredToken(uid: string): void {
        try {
            localStorage.removeItem(TOKEN_KEY(uid));
        } catch {
            // non-fatal
        }
    }
}
