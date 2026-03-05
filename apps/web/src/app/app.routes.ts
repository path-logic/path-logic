import type { Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';

/**
 * Application route configuration.
 *
 * The authGuard is applied ONCE at the parent route level.
 * All child routes inherit protection automatically — no need to repeat canActivate.
 */
export const appRoutes: Routes = [
    // Public routes (no guard)
    {
        path: 'sign-in',
        loadComponent: () =>
            import('./pages/sign-in/sign-in.component').then(m => m.SignInComponent),
    },

    // Protected routes — authGuard applied ONCE at this parent level
    {
        path: '',
        canActivate: [authGuard],
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
            },
            {
                path: 'accounts',
                loadComponent: () =>
                    import('./pages/accounts/accounts-page.component').then(
                        m => m.AccountsPageComponent,
                    ),
            },
            {
                path: 'accounts/:accountId',
                loadComponent: () =>
                    import('./pages/account-detail/account-detail.component').then(
                        m => m.AccountDetailComponent,
                    ),
            },
            {
                path: 'accounts/:accountId/info',
                loadComponent: () =>
                    import('./pages/account-detail/info/account-info.component').then(
                        m => m.AccountInfoComponent,
                    ),
            },
            {
                path: 'payees',
                loadComponent: () =>
                    import('./pages/payees/payees-page.component').then(m => m.PayeesPageComponent),
            },
            {
                path: 'settings',
                children: [
                    {
                        path: '',
                        loadComponent: () =>
                            import('./pages/settings/settings-page.component').then(
                                m => m.SettingsPageComponent,
                            ),
                    },
                    {
                        path: 'dev',
                        children: [
                            {
                                path: '',
                                loadComponent: () =>
                                    import('./pages/settings/dev/dev-index.component').then(
                                        m => m.DevIndexComponent,
                                    ),
                            },
                            {
                                path: 'auth',
                                loadComponent: () =>
                                    import('./pages/settings/dev/auth/dev-auth.component').then(
                                        m => m.DevAuthComponent,
                                    ),
                            },
                            {
                                path: 'maintenance',
                                loadComponent: () =>
                                    import(
                                        './pages/settings/dev/maintenance/dev-maintenance.component'
                                    ).then(m => m.DevMaintenanceComponent),
                            },
                            {
                                path: 'sync-test',
                                loadComponent: () =>
                                    import(
                                        './pages/settings/dev/sync-test/sync-test.component'
                                    ).then(m => m.SyncTestComponent),
                            },
                        ],
                    },
                    {
                        path: 'style-guide',
                        loadComponent: () =>
                            import('./pages/settings/style-guide/style-guide.component').then(
                                m => m.StyleGuideComponent,
                            ),
                    },
                ],
            },
            // Additional routes will be added during component porting:
        ],
    },

    // Wildcard redirect
    { path: '**', redirectTo: '' },
];
