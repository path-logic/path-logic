import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ITransactionConflict } from '../../../../lib/sync/MergeEngine';
import { AiAssistantService } from '../../../../services/ai-assistant/ai-assistant.service';
import { AuthService } from '../../../../services/auth/auth.service';
import { CommandPaletteService } from '../../../../services/command-palette/command-palette.service';
import { GeminiService } from '../../../../services/gemini/gemini.service';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';
import { LlmService } from '../../../../services/llm/llm.service';
import { SecurityManagerService } from '../../../../services/security-manager/security-manager.service';
import { SidebarContextService } from '../../../../services/sidebar-context/sidebar-context.service';
import { SyncService } from '../../../../services/sync/sync.service';
import { ThemeService } from '../../../../services/theme/theme.service';
import { SyncTestComponent } from './sync-test.component';
import {
    Default,
    SimulatedConflictState,
    SimulatedOfflineAndErrorState
} from './sync-test.component.stories';

describe('SyncTestComponent Stories Spec Wrapper', () => {
    let fixture: ComponentFixture<SyncTestComponent>;

    const mockSyncConflicts = signal<Array<ITransactionConflict>>([]);
    const mockSyncStatus = signal<string>('synced');
    const mockSyncError = signal<string | null>(null);

    const mockLedgerStore = {
        accounts: signal<Array<any>>([]),
        transactions: signal<Array<any>>([]),
        schedules: signal<Array<any>>([]),
        recurringSchedules: signal<Array<any>>([]),
        categories: signal<Array<any>>([]),
        isInitialized: signal<boolean>(true),
        syncStatus: mockSyncStatus,
        syncError: mockSyncError,
        authError: signal<boolean>(false),
        hasLocalFallback: signal<boolean>(true),
        mergeCount: signal<number>(0),
        syncConflicts: mockSyncConflicts,
        resolveConflict: vi.fn().mockImplementation((id: string, _keepMine: boolean) => {
            mockSyncConflicts.update((conflicts: Array<ITransactionConflict>) =>
                conflicts.filter(c => c.id !== id)
            );
            return Promise.resolve();
        })
    };

    const mockAuthService = {
        currentUser: signal({
            displayName: 'Dev Engineer',
            email: 'dev@pathlogic.io',
            photoURL: null
        }),
        accessToken: signal<string | null>('valid-token'),
        signOut: vi.fn().mockResolvedValue(undefined),
        signInWithGoogle: vi.fn().mockResolvedValue(undefined)
    };

    const mockSyncService = {
        isSyncing: signal<boolean>(false),
        saveToDrive: vi.fn().mockResolvedValue(undefined),
        syncFromDrive: vi.fn().mockResolvedValue(undefined),
        getSyncStatus: vi.fn().mockReturnValue({ inProgress: false, lastSyncTime: 1700000000000 })
    };

    const mockSecurityManager = {
        isIdle: signal<boolean>(false),
        startMonitoring: vi.fn(),
        resetTimers: vi.fn()
    };

    const mockLlmService = {
        newerModelAlert: signal<any>(null),
        checkStartupNewerModel: vi.fn().mockResolvedValue(undefined),
        upgradeToNewestModel: vi.fn().mockResolvedValue(undefined),
        dismissModelUpgrade: vi.fn().mockResolvedValue(undefined)
    };

    const mockAiAssistantService = {
        isOpen: signal<boolean>(false),
        messages: signal<Array<any>>([]),
        isSending: signal<boolean>(false),
        toggle: vi.fn(),
        open: vi.fn(),
        close: vi.fn(),
        clearChat: vi.fn(),
        sendMessage: vi.fn().mockResolvedValue(undefined)
    };

    const mockGeminiService = {
        hasKey: vi.fn().mockReturnValue(true),
        apiKey: vi.fn().mockReturnValue('mock-gemini-key')
    };

    const mockThemeService = {
        resolvedTheme: signal<string>('dark'),
        setTheme: vi.fn(),
        toggleTheme: vi.fn()
    };

    const mockCommandPaletteService = {
        open: vi.fn(),
        close: vi.fn(),
        isOpen: signal<boolean>(false)
    };

    const mockSidebarContextService = {
        customTemplate: signal<any>(null),
        isNavSectionCollapsed: signal<boolean>(false),
        navPosition: signal<'top' | 'bottom'>('top'),
        hasContext: signal<boolean>(false),
        setContext: vi.fn(),
        clearContext: vi.fn(),
        setNavPosition: vi.fn(),
        toggleNavSection: vi.fn(),
        toggleNavPosition: vi.fn()
    };

    beforeEach(async () => {
        mockSyncConflicts.set([]);
        mockSyncStatus.set('synced');
        mockSyncError.set(null);
        mockLedgerStore.resolveConflict.mockClear();

        await TestBed.configureTestingModule({
            imports: [SyncTestComponent],
            providers: [
                provideRouter([]),
                { provide: SyncService, useValue: mockSyncService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: LlmService, useValue: mockLlmService },
                { provide: AiAssistantService, useValue: mockAiAssistantService },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: ThemeService, useValue: mockThemeService },
                { provide: CommandPaletteService, useValue: mockCommandPaletteService },
                { provide: SidebarContextService, useValue: mockSidebarContextService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SyncTestComponent);
        fixture.detectChanges();
    });

    it('executes Default story play function', async () => {
        const stepMock = vi.fn(async (_label: string, fn: () => Promise<void>) => await fn());
        await Default.play?.({
            canvasElement: fixture.nativeElement,
            step: stepMock
        } as any);

        expect(stepMock).toHaveBeenCalledTimes(2);
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Sync Test Suite');
        expect(compiled.textContent).toContain('Immediate Drive Save');
    });

    it('executes SimulatedConflictState story play function', async () => {
        const stepMock = vi.fn(async (_label: string, fn: () => Promise<void>) => await fn());
        await SimulatedConflictState.play?.({
            canvasElement: fixture.nativeElement,
            step: stepMock
        } as any);

        expect(stepMock).toHaveBeenCalledTimes(3);
        expect(mockLedgerStore.resolveConflict).toHaveBeenCalled();
    });

    it('executes SimulatedOfflineAndErrorState story play function', async () => {
        const stepMock = vi.fn(async (_label: string, fn: () => Promise<void>) => await fn());
        await SimulatedOfflineAndErrorState.play?.({
            canvasElement: fixture.nativeElement,
            step: stepMock
        } as any);

        expect(stepMock).toHaveBeenCalledTimes(3);
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('synced');
    });
});
