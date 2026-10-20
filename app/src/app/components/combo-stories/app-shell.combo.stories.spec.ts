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
import { ComboShellComponent, DefaultDashboardLayout } from './app-shell.combo.stories';

describe('ComboShellComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<ComboShellComponent>;

    const mockLedgerStore = {
        transactions: signal<Array<any>>(new Array<any>()),
        accounts: signal<Array<any>>(new Array<any>()),
        schedules: signal<Array<any>>(new Array<any>()),
        payees: signal<Array<any>>(new Array<any>()),
        syncStatus: signal<string>('idle'),
        authError: signal<boolean>(false),
        isInitialized: signal<boolean>(true),
        hasLocalFallback: signal<boolean>(true)
    };

    const mockAuthService = {
        currentUser: signal<{ displayName: string; email: string }>({
            displayName: 'Demo User',
            email: 'demo@example.com'
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
            imports: [ComboShellComponent],
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

        fixture = TestBed.createComponent(ComboShellComponent);
        fixture.detectChanges();
    });

    it('executes DefaultDashboardLayout story interaction test', async () => {
        await DefaultDashboardLayout.play?.({ canvasElement: fixture.nativeElement } as any);

        const content: string = fixture.nativeElement.textContent;
        expect(content).toContain('Dashboard');
        expect(content).toContain('Net Position');
        expect(fixture.nativeElement.querySelector('header')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('footer')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('breadcrumb-nav')).not.toBeNull();
    });
});
