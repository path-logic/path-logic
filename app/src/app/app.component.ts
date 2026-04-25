import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, effect, inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { environment } from '../environments/environment';
import { AuthService } from './services/auth/auth.service';
import { LedgerStore } from './services/ledger-store/ledger.store';
import { PostHogService } from './services/posthog/posthog.service';
import { SyncService } from './services/sync/sync.service';

/** How long after the last mutation before auto-saving to Drive. */
const AUTO_SAVE_DEBOUNCE_MS = 3_000;

/**
 * Root application component.
 *
 * ## Startup sequence
 *
 *   1. Firebase resolves onAuthStateChanged (handled by AuthService).
 *      AuthService simultaneously tries to restore the persisted Google
 *      OAuth token from localStorage.
 *
 *   2. Once `isInitializing` is false and a user exists, this component
 *      calls `initializeApp()` exactly once:
 *
 *        a. Google token available → `SyncService.loadFromDrive()`
 *           Full Drive sync: download → decrypt → load → save local fallback.
 *
 *        b. Google token absent (token expired or first browser install) →
 *           `SyncService.loadFromLocalOnly(userId)`
 *           Sets authError = true so the sync-pending banner pressure
 *           the user to re-authenticate before any important operations.
 *           Data is local-only until they do.
 *
 *   3. After initializeApp() completes, `LedgerStore.isInitialized()` is
 *      true and the app renders normally.
 *
 * ## Error cases
 *
 *   - Firebase auth fails / no session → AuthService redirects to /sign-in.
 *   - Drive sync fails with GDriveAuthError → SyncService falls back to
 *     local copy and sets authError = true.
 *   - Drive sync fails with other error → syncStatus = 'error', banner shown.
 */
@Component({
    imports: [RouterOutlet],
    selector: 'root',
    template: `<router-outlet />`,
    styles: `
        :host {
            display: block;
            min-height: 100vh;
        }
    `
})
export class AppComponent {
    readonly title = 'Path Logic';

    private readonly authService = inject(AuthService);
    private readonly syncService = inject(SyncService);
    private readonly ledgerStore = inject(LedgerStore);
    private readonly posthogService = inject(PostHogService);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly destroyRef = inject(DestroyRef);

    private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

    /** Prevents the init sequence from running more than once. */
    private initStarted = false;

    constructor() {
        if (isPlatformBrowser(this.platformId) && environment.posthogKey) {
            this.posthogService.init(environment.posthogKey, {
                api_host: environment.posthogHost || 'https://us.i.posthog.com',
                ui_host: 'https://us.posthog.com',
                capture_exceptions: true
            });
        }

        // ── Sequential startup: Firebase → Google token → DB load ─────────────
        //
        // The effect waits for Firebase auth to resolve (isInitializing = false),
        // then triggers initializeApp() exactly once. AuthService has already
        // attempted to restore the cached Google token from localStorage by the
        // time this effect fires, so accessToken() may already be set.
        effect(() => {
            const isInitializing = this.authService.isInitializing();
            const user = this.authService.currentUser();

            // Wait until Firebase has confirmed the auth state
            if (isInitializing || !user) return;

            // Guard: only run once per app lifecycle
            if (this.initStarted) return;
            this.initStarted = true;

            if (environment.e2e) {
                this.ledgerStore
                    .initialize()
                    .catch((e: unknown) =>
                        console.error('[AppComponent] E2E DB init failed:', e)
                    );
                return;
            }

            this.initializeApp(user.uid);
        });

        // ── Auto-save to Drive whenever the ledger becomes dirty ──────────────
        //
        // Debounced to collapse rapid consecutive mutations (bulk import, etc.)
        // into a single upload. Only runs when Drive token is available — if the
        // user is in degraded (local-only) mode, the sync-pending banner guides
        // them to re-authenticate instead.
        effect(() => {
            const isDirty = this.ledgerStore.isDirty();
            const hasToken = !!this.authService.accessToken();
            const isLoggedIn = this.authService.isLoggedIn();

            if (!isDirty || !isLoggedIn || !hasToken || environment.e2e) return;

            if (this.autoSaveTimer !== null) clearTimeout(this.autoSaveTimer);

            this.autoSaveTimer = setTimeout(() => {
                this.autoSaveTimer = null;
                this.syncService.saveToDrive().catch((e: unknown) => {
                    console.error('[AppComponent] Auto-save to Drive failed:', e);
                });
            }, AUTO_SAVE_DEBOUNCE_MS);
        });

        this.destroyRef.onDestroy(() => {
            if (this.autoSaveTimer !== null) clearTimeout(this.autoSaveTimer);
        });
    }

    /**
     * Sequential DB initialization:
     *   1. Google token present → full Drive sync.
     *   2. Google token absent → local-only degraded mode.
     */
    private initializeApp(userId: string): void {
        const accessToken = this.authService.accessToken();

        if (accessToken) {
            // Happy path — token was restored from cache or just obtained via popup
            console.log('[AppComponent] Google token available — loading from Drive.');
            this.syncService.loadFromDrive().catch((e: unknown) => {
                console.error('[AppComponent] loadFromDrive failed:', e);
            });
        } else {
            // Degraded path — token expired or not yet obtained
            // (first install on this browser, or >55 min since last login)
            console.warn(
                '[AppComponent] No Google token — loading local fallback. ' +
                'User will be prompted to re-authenticate.'
            );
            this.syncService.loadFromLocalOnly(userId).catch((e: unknown) => {
                console.error('[AppComponent] loadFromLocalOnly failed:', e);
            });
        }
    }
}
