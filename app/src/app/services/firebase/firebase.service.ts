import { Injectable } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import { initializeApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import {
    browserLocalPersistence,
    browserPopupRedirectResolver,
    initializeAuth
} from 'firebase/auth';

import { environment } from '../../../environments/environment';

/**
 * Firebase initialization service.
 * Since @angular/fire doesn't support Angular 21 yet, we use the Firebase JS SDK directly.
 *
 * IMPORTANT: We use initializeAuth() instead of getAuth() so we can explicitly set
 * browserPopupRedirectResolver. Without this, getRedirectResult() in the modular v9+
 * SDK returns null because it has no resolver to load the auth iframe from the authDomain.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseService {
    readonly app: FirebaseApp;
    readonly auth: Auth;

    constructor() {
        this.app = initializeApp(environment.firebase);
        this.auth = initializeAuth(this.app, {
            persistence: browserLocalPersistence,
            popupRedirectResolver: browserPopupRedirectResolver
        });
    }
}
