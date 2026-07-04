import { isPlatformBrowser } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    effect,
    inject,
    PLATFORM_ID,
    signal
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';

import { environment } from '../environments/environment';
import { EnvBannerComponent } from './components/ui/env-banner/env-banner.component';
import { AuthService } from './services/auth/auth.service';
import { FaviconService } from './services/favicon/favicon.service';
import { LedgerStore } from './services/ledger-store/ledger.store';
import { PostHogService } from './services/posthog/posthog.service';
import { SyncService } from './services/sync/sync.service';
import { ThemeService } from './services/theme/theme.service';

/** How long after the last mutation before auto-saving to Drive. */
const AUTO_SAVE_DEBOUNCE_MS = 3_000;

/**
 * Root application component.
 *
 * ## Local-First Startup Sequence
 *
 *   1. Firebase resolves onAuthStateChanged → currentUser() set
 *      AuthService simultaneously restores the Google OAuth token from localStorage.
 *
 *   2. initializeApp() runs exactly once (guarded by initStarted):
 *
 *      a. SyncService.initFromLocal(userId)
 *         → Loads IndexedDB snapshot instantly (<200ms)
 *         → App is immediately usable if local data exists
 *         → Returns false if this is a new device (no local data)
 *
 *      b. SyncService.syncFromDrive() — BACKGROUND
 *         → If local data existed: no await, fully background
 *         → If new device: awaited — shows "Syncing your Ledger" until done
 *         → Compares local version timestamp with Drive modifiedTime
 *         → Downloads + merges if Drive is newer; uploads if local is newer
 *
 *   3. All subsequent mutations write to IndexedDB immediately (via
 *      LedgerStore.commitToLocal()) then trigger debounced Drive upload.
 *
 * ## Error Cases
 *   - Firebase fails / no session → AuthService redirects to /sign-in
 *   - No Drive token (token expired) → local-only, authError banner shows
 *   - Drive API fails → syncStatus = 'error', error detail shown in banner
 */
@Component({
    imports: [RouterOutlet, EnvBannerComponent],
    selector: 'root',
    template: `
        <env-banner />
        <router-outlet />
    `,
    styles: `
        :host {
            display: block;
            min-height: 100vh;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
    readonly title = 'Path Logic';

    private readonly authService = inject(AuthService);
    private readonly syncService = inject(SyncService);
    private readonly ledgerStore = inject(LedgerStore);
    private readonly posthogService = inject(PostHogService);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly destroyRef = inject(DestroyRef);

    /** True while waiting for Drive data on a new device (no local snapshot). */
    readonly isSyncingNewDevice = signal<boolean>(false);

    private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
    private initStarted = false;

    constructor() {
        // Initialize theme before first paint — reads OS/saved preference and
        // sets data-theme on <html>, activating the CSS custom property system.
        inject(ThemeService);

        // Initialize dynamic favicon based on active theme and environment
        inject(FaviconService);

        // Set document title — include env label on non-production builds
        const titleService = inject(Title);
        const isProd = environment.production || environment.appEnv === 'production';
        titleService.setTitle(
            isProd ? 'Path Logic' : `[${environment.appEnv.toUpperCase()}] Path Logic`
        );

        if (isPlatformBrowser(this.platformId) && environment.posthogKey) {
            this.posthogService.init(environment.posthogKey, {
                api_host: environment.posthogHost || 'https://us.i.posthog.com',
                ui_host: 'https://us.posthog.com',
                capture_exceptions: true
            });
        }

        // ── Local-First startup: Firebase confirmed → IndexedDB → Drive sync ──
        effect(() => {
            const isInitializing = this.authService.isInitializing();
            const user = this.authService.currentUser();

            if (isInitializing || !user) return;
            if (this.initStarted) return;
            this.initStarted = true;

            if (environment.e2e) {
                this.syncService
                    .initFromLocal('e2e-user')
                    .then((loaded: boolean) => {
                        if (!loaded) {
                            return this.ledgerStore.initialize();
                        }
                        return;
                    })
                    .catch((e: unknown) => {
                        console.error('[AppComponent] E2E DB init failed:', e);
                        this.ledgerStore.initialize().catch(console.error);
                    });
                return;
            }

            this.initializeApp(user.uid);
        });

        // ── Auto-save: push dirty local state to Drive in the background ──────
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
     * Local-first initialization:
     *   1. Load from IndexedDB (instant)
     *   2. Sync with Drive in the background
     *
     * If no local data exists (new device), step 2 blocks the UI with
     * a "Syncing your Ledger" screen until Drive data is downloaded.
     */
    private initializeApp(userId: string): void {
        this.syncService
            .initFromLocal(userId)
            .then(async (hasLocalData: boolean) => {
                if (!hasLocalData) {
                    // New device — attempt to load from Drive.
                    // Race against a hard timeout so a stale token or network
                    // issue never permanently hangs the UI.
                    this.isSyncingNewDevice.set(true);
                    const SYNC_TIMEOUT_MS = 15_000;
                    const timeoutPromise = new Promise<void>(resolve =>
                        setTimeout(() => {
                            console.warn(
                                `[AppComponent] Drive sync timed out after ${SYNC_TIMEOUT_MS}ms — falling through to local-only mode.`
                            );
                            resolve();
                        }, SYNC_TIMEOUT_MS)
                    );
                    try {
                        await Promise.race([this.syncService.syncFromDrive(), timeoutPromise]);
                    } finally {
                        // Ensure DB is initialized even if sync failed or timed out
                        if (!this.ledgerStore.isInitialized()) {
                            await this.ledgerStore.initialize();
                        }
                        this.isSyncingNewDevice.set(false);
                    }
                } else {
                    // App is immediately usable — sync Drive in the background
                    this.syncService.syncFromDrive().catch((e: unknown) => {
                        console.error('[AppComponent] Background Drive sync failed:', e);
                    });
                }
            })
            .catch((e: unknown) => {
                console.error('[AppComponent] initFromLocal failed:', e);
                // Last resort: ensure app is at least initialized
                this.ledgerStore.initialize().catch(console.error);
            });
    }
}
