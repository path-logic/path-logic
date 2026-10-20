import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { LedgerStore } from '../ledger-store/ledger.store';
import { SecurityManagerService } from './security-manager.service';

describe('SecurityManagerService', () => {
    let service: SecurityManagerService;
    let mockAuthService: {
        currentUser: ReturnType<typeof signal>;
        signOut: ReturnType<typeof vi.fn>;
    };
    let mockLedgerStore: {
        isDirty: ReturnType<typeof signal>;
        authError: ReturnType<typeof signal>;
    };

    beforeEach(() => {
        vi.useFakeTimers();

        mockAuthService = {
            currentUser: signal({ id: 'user-1', email: 'test@example.com' }),
            signOut: vi.fn().mockResolvedValue(undefined)
        };

        mockLedgerStore = {
            isDirty: signal(false),
            authError: signal(false)
        };

        TestBed.configureTestingModule({
            providers: [
                SecurityManagerService,
                { provide: AuthService, useValue: mockAuthService },
                { provide: LedgerStore, useValue: mockLedgerStore }
            ]
        });

        service = TestBed.inject(SecurityManagerService);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should be created and default to normal timeout', () => {
        expect(service).toBeTruthy();
        expect(service.isExtendedTimeout()).toBe(false);
        expect(service.isIdle()).toBe(false);
    });

    it('should trigger warning at 5 minutes and logout at 10 minutes in normal mode', () => {
        service.resetTimers();

        // 4m 59s: not idle yet
        vi.advanceTimersByTime(4 * 60 * 1000 + 59 * 1000);
        expect(service.isIdle()).toBe(false);
        expect(mockAuthService.signOut).not.toHaveBeenCalled();

        // 5m: warning triggers overlay
        vi.advanceTimersByTime(1000);
        expect(service.isIdle()).toBe(true);

        // 10m: auto-logout triggers
        vi.advanceTimersByTime(5 * 60 * 1000);
        expect(mockAuthService.signOut).toHaveBeenCalled();
    });

    it('should extend timeout by 3x (15m warning, 30m logout) when operation acquires extended timeout', () => {
        const release = service.acquireExtendedTimeout('qif_import');
        expect(service.isExtendedTimeout()).toBe(true);

        // At 5 minutes: should NOT be idle yet because 3x = 15 minutes
        vi.advanceTimersByTime(5 * 60 * 1000);
        expect(service.isIdle()).toBe(false);

        // At 14 minutes: still not idle
        vi.advanceTimersByTime(9 * 60 * 1000);
        expect(service.isIdle()).toBe(false);

        // At 15 minutes: warning overlay triggers (3x 5m = 15m)
        vi.advanceTimersByTime(1 * 60 * 1000);
        expect(service.isIdle()).toBe(true);
        expect(mockAuthService.signOut).not.toHaveBeenCalled();

        // At 30 minutes: auto-logout triggers (3x 10m = 30m)
        vi.advanceTimersByTime(15 * 60 * 1000);
        expect(mockAuthService.signOut).toHaveBeenCalled();

        release();
        expect(service.isExtendedTimeout()).toBe(false);
    });

    it('should support multiple concurrent operations and revert only when all release', () => {
        const release1 = service.acquireExtendedTimeout('qif_import');
        const release2 = service.acquireExtendedTimeout('ai_autocategorize');
        expect(service.isExtendedTimeout()).toBe(true);

        release1();
        // Still extended because release2 is still active
        expect(service.isExtendedTimeout()).toBe(true);

        release2();
        expect(service.isExtendedTimeout()).toBe(false);
    });
});
