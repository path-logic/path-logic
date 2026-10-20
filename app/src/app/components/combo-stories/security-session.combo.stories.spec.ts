import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiAssistantService } from '../../services/ai-assistant/ai-assistant.service';
import { AuthService } from '../../services/auth/auth.service';
import { CommandPaletteService } from '../../services/command-palette/command-palette.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { SyncService } from '../../services/sync/sync.service';
import { ThemeService } from '../../services/theme/theme.service';
import { ComboSecuritySessionComponent, IdleAppScreenshot } from './security-session.combo.stories';

describe('ComboSecuritySessionComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<ComboSecuritySessionComponent>;

    const mockLedgerStore = {
        transactions: signal<Array<any>>(new Array<any>()),
        accounts: signal<Array<any>>(new Array<any>()),
        syncStatus: signal<string>('idle'),
        authError: signal<boolean>(false),
        isInitialized: signal<boolean>(true),
        hasLocalFallback: signal<boolean>(true)
    };

    const mockAuthService = {
        currentUser: signal<{ displayName: string; email: string }>({
            displayName: 'Protected User',
            email: 'secure@example.com'
        }),
        signOut: vi.fn().mockResolvedValue(undefined),
        signInWithGoogle: vi.fn().mockResolvedValue(undefined)
    };

    const mockSyncService = {
        isSyncing: signal<boolean>(false),
        getSyncStatus: vi.fn().mockReturnValue({ lastSyncTime: 1700000000000 })
    };

    const mockThemeService = {
        resolvedTheme: signal<string>('light'),
        setTheme: vi.fn(),
        toggleTheme: vi.fn()
    };

    const mockAiAssistantService = {
        isOpen: signal<boolean>(false),
        toggle: vi.fn()
    };

    const mockCommandPaletteService = {
        isOpen: signal<boolean>(false),
        open: vi.fn(),
        close: vi.fn()
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComboSecuritySessionComponent],
            providers: [
                provideRouter(new Array<any>()),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: SyncService, useValue: mockSyncService },
                { provide: ThemeService, useValue: mockThemeService },
                { provide: AiAssistantService, useValue: mockAiAssistantService },
                { provide: CommandPaletteService, useValue: mockCommandPaletteService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ComboSecuritySessionComponent);
        fixture.detectChanges();
    });

    it('executes IdleAppScreenshot story interaction test', async () => {
        await IdleAppScreenshot.play?.({ canvasElement: fixture.nativeElement } as any);

        const content: string = fixture.nativeElement.textContent;
        expect(content).toContain('Net Worth');
        expect(content).toContain('$1,245,678.90');
        expect(content).toContain('Session Paused');
        expect(content).toContain('Resume Session');
    });

    it('toggles idle state when simulate idle timeout is used', () => {
        fixture.componentInstance.isIdle.set(false);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Simulate Idle Timeout');

        const button: HTMLButtonElement | null =
            fixture.nativeElement.querySelector('button.bg-red-500\\/20');
        button?.click();
        fixture.detectChanges();

        expect(fixture.componentInstance.isIdle()).toBe(true);
        expect(fixture.nativeElement.textContent).toContain('Session Paused');
    });
});
