import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { User, UserCredential } from 'firebase/auth';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

import { environment } from '../../../environments/environment';
import { FirebaseService } from '../firebase/firebase.service';

/**
 * AuthService wraps Firebase Authentication with Angular signals.
 *
 * Silent auto-login: Firebase Auth persists the authentication state in IndexedDB
 * by default. On every app initialization, `onAuthStateChanged` fires immediately
 * with the cached user (or `null` if no session). This means users are silently
 * logged in without any interaction, and the sync pipeline is always available.
 * If no session exists, the app redirects to `/sign-in`.
 *
 * In E2E mode, auth is bypassed entirely — no Firebase listeners, no redirects.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly firebase = inject(FirebaseService);
    private readonly router = inject(Router);

    /** Internal Firebase user signal */
    private readonly _user = signal<User | null | undefined>(undefined);

    /** The current Firebase user (null = not logged in, undefined = still loading) */
    readonly currentUser = computed(() => this._user());

    /** Whether the user is currently logged in. */
    readonly isLoggedIn = computed((): boolean => environment.e2e === true || !!this.currentUser());

    /** Whether auth state is still being resolved on init. */
    readonly isInitializing = signal<boolean>(!environment.e2e);

    /** The Google OAuth access token for Drive API calls. */
    readonly accessToken = signal<string | null>(null);

    /** The user's Firebase UID. */
    readonly userId = computed((): string | null => this.currentUser()?.uid ?? null);

    constructor() {
        // Skip Firebase auth in E2E test mode
        if (environment.e2e) {
            return;
        }

        // Listen for auth state changes (fires immediately with cached state)
        onAuthStateChanged(this.firebase.auth, (user: User | null): void => {
            this._user.set(user);
            this.isInitializing.set(false);
        });

        // Redirect to sign-in when auth resolves with no session
        effect((): void => {
            const user: User | null | undefined = this.currentUser();
            if (user === undefined) return; // still loading
            if (!user) {
                void this.router.navigate(['/sign-in']);
            }
        });
    }

    async signInWithGoogle(): Promise<UserCredential> {
        const provider: GoogleAuthProvider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/drive.appdata');
        const result: UserCredential = await signInWithPopup(this.firebase.auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        this.accessToken.set(credential?.accessToken ?? null);
        return result;
    }

    async signOut(): Promise<void> {
        await signOut(this.firebase.auth);
        this.accessToken.set(null);
    }
}
