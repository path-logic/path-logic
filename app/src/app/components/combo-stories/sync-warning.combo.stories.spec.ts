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
import { ComboSyncWarningComponent, LocalFallbackMode } from './sync-warning.combo.stories';

describe('ComboSyncWarningComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<ComboSyncWarningComponent>;

    const mockLedgerStore = {
        transactions: signal<Array<any>>(new Array<any>()),
        accounts: signal<Array<any>>(new Array<any>()),
        syncStatus: signal<string>('pending-local'),
        authError: signal<boolean>(true),
        isDirty: signal<boolean>(true),
        isInitialized: signal<boolean>(true),
        hasLocalFallback: signal<boolean>(true)
    };

    const mockAuthService = {
        currentUser: signal<{ displayName: string; email: string }>({
            displayName: 'Disconnected User',
            email: 'user@example.com'
        }),
        signInWithGoogle: vi.fn().mockResolvedValue(undefined),
        signOut: vi.fn().mockResolvedValue(undefined)
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
            imports: [ComboSyncWarningComponent],
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

        fixture = TestBed.createComponent(ComboSyncWarningComponent);
        fixture.detectChanges();
    });

    it('executes LocalFallbackMode story interaction test', async () => {
        await LocalFallbackMode.play?.({ canvasElement: fixture.nativeElement } as any);

        const content: string = fixture.nativeElement.textContent;
        expect(content).toContain('You are working offline');
        expect(content).toContain('Cloud Sync Disconnected');
        expect(content).toContain('Reconnect to Google Drive');
        expect(content).toContain('Continue Local Editing');
        expect(content).toContain('Local Only');
    });
});
