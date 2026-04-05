import { inject } from '@angular/core';
import type { CanActivateFn, UrlTree } from '@angular/router';
import { Router } from '@angular/router';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth/auth.service';

/**
 * Functional route guard for protected routes.
 * Applied once at the parent route level so all child routes inherit protection.
 * Redirects to /sign-in if the user is not authenticated.
 * Bypassed when running in E2E test mode.
 */
export const authGuard: CanActivateFn = (): boolean | UrlTree => {
    if (environment.e2e) {
        return true;
    }

    const auth: AuthService = inject(AuthService);
    const router: Router = inject(Router);

    if (auth.isLoggedIn()) {
        return true;
    }

    return router.createUrlTree(['/sign-in']);
};
