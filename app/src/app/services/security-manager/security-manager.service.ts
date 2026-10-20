import type { Signal, WritableSignal } from '@angular/core';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import type { TimerHandle } from '@core';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { LedgerStore } from '../ledger-store/ledger.store';

const IDLE_TIMEOUT_MS: number = 10 * 60 * 1000; // 10 minutes to logout
const WARNING_TIMEOUT_MS: number = 5 * 60 * 1000; // 5 minutes to show overlay
const EXTENDED_TIMEOUT_MULTIPLIER: number = 3; // 3x multiplier during imports and AI operations

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

    private readonly activeExtendedOperations: WritableSignal<Set<string>> = signal<Set<string>>(
        new Set<string>()
    );

    /**
     * Whether the session idle timeout is currently extended by 3x.
     */
    readonly isExtendedTimeout: Signal<boolean> = computed<boolean>(
        () => this.activeExtendedOperations().size > 0
    );

    private idleTimer: TimerHandle | null = null;
    private logoutTimer: TimerHandle | null = null;
    private activityListener: (() => void) | null = null;
    private beforeUnloadListener: ((e: BeforeUnloadEvent) => void) | null = null;

    /**
     * Acquire extended session timeout (3x) for an active long-running operation.
     * Returns a release function to be called when the operation finishes.
     */
    acquireExtendedTimeout(operationId: string): () => void {
        this.activeExtendedOperations.update(ops => {
            const next = new Set(ops);
            next.add(operationId);
            return next;
        });
        this.resetTimers();

        return () => {
            this.releaseExtendedTimeout(operationId);
        };
    }

    /**
     * Release extended session timeout for an operation.
     */
    releaseExtendedTimeout(operationId: string): void {
        this.activeExtendedOperations.update(ops => {
            const next = new Set(ops);
            next.delete(operationId);
            return next;
        });
        this.resetTimers();
    }

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

        const multiplier = this.isExtendedTimeout() ? EXTENDED_TIMEOUT_MULTIPLIER : 1;
        const warningMs = WARNING_TIMEOUT_MS * multiplier;
        const idleMs = IDLE_TIMEOUT_MS * multiplier;

        // Warning overlay
        this.idleTimer = setTimeout((): void => {
            if (this.authService.currentUser()) {
                console.log(
                    `[SecurityManager] Session idle: showing overlay (extended: ${this.isExtendedTimeout()})`
                );
                this.isIdle.set(true);
            }
        }, warningMs);

        // Auto-logout
        this.logoutTimer = setTimeout((): void => {
            if (this.authService.currentUser()) {
                console.log(
                    `[SecurityManager] Session timeout: logging out (extended: ${this.isExtendedTimeout()})`
                );
                void this.authService.signOut();
            }
        }, idleMs);
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
