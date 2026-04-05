import { Injectable } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import { initializeApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { getAuth } from 'firebase/auth';

import { environment } from '../../../environments/environment';

/**
 * Firebase initialization service.
 * Since @angular/fire doesn't support Angular 21 yet, we use the Firebase JS SDK directly.
 * This service initializes the Firebase app and provides the Auth instance.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseService {
    readonly app: FirebaseApp;
    readonly auth: Auth;

    constructor() {
        this.app = initializeApp(environment.firebase);
        this.auth = getAuth(this.app);
    }
}
