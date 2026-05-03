import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { User } from 'firebase/auth';
import {
    browserPopupRedirectResolver,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
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
 * ## Sign-in Flow (Popup)
 *
 * We use signInWithPopup() with browserPopupRedirectResolver explicitly
 * passed. The COOP warning about window.close() is non-fatal — Firebase
 * communicates the credential via window.opener.postMessage() which
 * works because our app's COOP header is unsafe-none.
 *
 * signInWithRedirect() was attempted but is broken for localhost in
 * Firebase v12: the /__/auth/iframe postMessage bridge fails in Chrome's
 * current security model, causing getRedirectResult() to always return null.
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

    /** True until onAuthStateChanged fires with a definitive value. */
    readonly isInitializing = signal<boolean>(!environment.e2e);

    /** The Google OAuth access token for Drive API calls. */
    readonly accessToken = signal<string | null>(null);

    /** The user's Firebase UID. */
    readonly userId = computed((): string | null => this.currentUser()?.uid ?? null);

    constructor() {
        if (environment.e2e) {
            return;
        }

        // Listen for auth state changes (fires immediately with cached state)
        onAuthStateChanged(
            this.firebase.auth,
            (user: User | null): void => {
                this._user.set(user);
                this.isInitializing.set(false);

                if (user) {
                    const cached = this.restoreStoredToken(user.uid);
                    if (cached) {
                        this.accessToken.set(cached);
                        console.info(
                            '[AuthService] Restored cached Google token from localStorage'
                        );
                    } else {
                        console.info(
                            '[AuthService] No valid cached token — user must re-authenticate for Drive'
                        );
                    }
                }
            },
            error => {
                console.error('[AuthService] Fatal error inside onAuthStateChanged:', error);
                this.isInitializing.set(false);
            }
        );

        // Navigate based on auth state
        effect((): void => {
            if (this.isInitializing()) return;
            const user = this._user();
            if (user === undefined) return;
            if (!user) {
                if (!this.router.url.startsWith('/sign-in')) {
                    void this.router.navigate(['/sign-in']);
                }
            } else if (this.router.url.startsWith('/sign-in')) {
                const urlTree = this.router.parseUrl(this.router.url);
                const returnUrl = urlTree.queryParams['returnUrl'] || '/';
                void this.router.navigateByUrl(returnUrl);
            }
        });
    }

    /**
     * Initiates Google sign-in via a popup window.
     *
     * Note: Chrome shows a COOP warning about window.close() being blocked,
     * but this is non-fatal. The credential is communicated back via
     * window.opener.postMessage() which works because our app's COOP is
     * set to unsafe-none. The popup may not auto-close but auth completes.
     *
     * signInWithRedirect() was tried but is broken for localhost in Firebase
     * v12 — getRedirectResult() always returns null due to iframe bridge
     * failures in Chrome's current security model.
     */
    async signInWithGoogle(): Promise<void> {
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/drive.appdata');

        const result = await signInWithPopup(
            this.firebase.auth,
            provider,
            browserPopupRedirectResolver
        );

        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
            this.accessToken.set(credential.accessToken);
            this.storeToken(result.user.uid, credential.accessToken);
            console.info('[AuthService] Popup sign-in complete, Drive token stored');
        }
        this.posthogService.posthog.identify(result.user.uid, {
            email: result.user.email ?? undefined,
            name: result.user.displayName ?? undefined
        });
        this.posthogService.posthog.capture('user_signed_in', { provider: 'google' });
    }

    async signOut(): Promise<void> {
        this.posthogService.posthog.capture('user_signed_out');
        this.posthogService.posthog.reset();

        const uid = this.userId();
        if (uid) this.clearStoredToken(uid);

        await signOut(this.firebase.auth);
        this.accessToken.set(null);
    }

    // ── Token persistence ─────────────────────────────────────────────────────

    private storeToken(uid: string, token: string): void {
        try {
            const payload: IStoredToken = { token, expiresAt: Date.now() + TOKEN_TTL_MS };
            localStorage.setItem(TOKEN_KEY(uid), JSON.stringify(payload));
        } catch {
            // localStorage may be full or blocked — non-fatal
        }
    }

    private restoreStoredToken(uid: string): string | null {
        try {
            const raw = localStorage.getItem(TOKEN_KEY(uid));
            if (!raw) return null;
            const { token, expiresAt } = JSON.parse(raw) as IStoredToken;
            if (Date.now() >= expiresAt) {
                localStorage.removeItem(TOKEN_KEY(uid));
                return null;
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
