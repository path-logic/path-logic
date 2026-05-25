import type { WritableSignal } from '@angular/core';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import type { TimerHandle } from '@core';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { LedgerStore } from '../ledger-store/ledger.store';

const IDLE_TIMEOUT_MS: number = 10 * 60 * 1000; // 10 minutes to logout
const WARNING_TIMEOUT_MS: number = 5 * 60 * 1000; // 5 minutes to show overlay

/**
 * Angular service replacing the React `useSecurityManager` hook.
 * Manages idle timeouts, security overlays, and beforeunload guards.
 */
@Injectable({ providedIn: 'root' })
export class SecurityManagerService {
    private readonly destroyRef: DestroyRef = inject(DestroyRef);
    private readonly ledgerStore: LedgerStore = inject(LedgerStore);
    private readonly authService: AuthService = inject(AuthService);

    readonly isIdle: WritableSignal<boolean> = signal<boolean>(false);

    private idleTimer: TimerHandle | null = null;
    private logoutTimer: TimerHandle | null = null;
    private activityListener: (() => void) | null = null;
    private beforeUnloadListener: ((e: BeforeUnloadEvent) => void) | null = null;

    /**
     * Call from the AppShell component's constructor to start monitoring.
     */
    startMonitoring(): void {
        console.log('[SecurityManager] startMonitoring, environment.e2e:', environment.e2e);
        this.setupActivityListeners();
        this.setupBeforeUnloadGuard();
        this.resetTimers();

        this.destroyRef.onDestroy((): void => {
            this.cleanup();
        });
    }

    /**
     * Reset idle timers (called on user activity or "Resume Session").
     */
    resetTimers(): void {
        if (this.idleTimer) clearTimeout(this.idleTimer);
        if (this.logoutTimer) clearTimeout(this.logoutTimer);

        if (this.isIdle()) {
            this.isIdle.set(false);
        }

        // Do not activate idle timers in E2E mode
        if (environment.e2e) {
            return;
        }

        // Warning overlay after 5 minutes
        this.idleTimer = setTimeout((): void => {
            if (this.authService.currentUser()) {
                console.log('[SecurityManager] Session idle: showing overlay');
                this.isIdle.set(true);
            }
        }, WARNING_TIMEOUT_MS);

        // Auto-logout after 10 minutes
        this.logoutTimer = setTimeout((): void => {
            if (this.authService.currentUser()) {
                console.log('[SecurityManager] Session timeout: logging out');
                void this.authService.signOut();
            }
        }, IDLE_TIMEOUT_MS);
    }

    private setupActivityListeners(): void {
        const events: Array<string> = ['mousedown', 'keydown', 'scroll', 'touchstart'];

        const handleActivity = (): void => {
            if (!this.isIdle()) {
                this.resetTimers();
            }
        };

        this.activityListener = handleActivity;
        events.forEach((event: string): void => window.addEventListener(event, handleActivity));

        this.destroyRef.onDestroy((): void => {
            events.forEach((event: string): void =>
                window.removeEventListener(event, handleActivity)
            );
        });
    }

    private setupBeforeUnloadGuard(): void {
        this.beforeUnloadListener = (e: BeforeUnloadEvent): void => {
            if (this.ledgerStore.isDirty() || this.ledgerStore.authError()) {
                e.preventDefault();
            }
        };

        window.addEventListener('beforeunload', this.beforeUnloadListener);

        this.destroyRef.onDestroy((): void => {
            if (this.beforeUnloadListener) {
                window.removeEventListener('beforeunload', this.beforeUnloadListener);
            }
        });
    }

    private cleanup(): void {
        if (this.idleTimer) clearTimeout(this.idleTimer);
        if (this.logoutTimer) clearTimeout(this.logoutTimer);
    }
}
