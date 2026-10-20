import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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

describe('SyncTestComponent', () => {
    let fixture: ComponentFixture<SyncTestComponent>;
    let component: SyncTestComponent;

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
        resolveConflict: vi.fn().mockImplementation((id: string, keepMine: boolean) => {
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

    const mockSaveToDrive = vi.fn().mockResolvedValue(undefined);
    const mockSyncFromDrive = vi.fn().mockResolvedValue(undefined);

    const mockSyncService = {
        isSyncing: signal<boolean>(false),
        saveToDrive: mockSaveToDrive,
        syncFromDrive: mockSyncFromDrive,
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
        mockSaveToDrive.mockClear();
        mockSyncFromDrive.mockClear();
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
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the sync test component', () => {
        expect(component).toBeTruthy();
    });

    it('should render page header and diagnostic sections', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Sync Test Suite');
        expect(compiled.textContent).toContain('1. Sync Triggers');
        expect(compiled.textContent).toContain('2. Conflict Simulation');
        expect(compiled.textContent).toContain('3. Network Status & Error Simulation');
    });

    it('should trigger immediate sync when clicking Immediate Drive Save button', async () => {
        const button = fixture.debugElement.query(By.css('#btn-trigger-immediate-sync'));
        expect(button).toBeTruthy();

        button.nativeElement.click();
        fixture.detectChanges();

        expect(mockSaveToDrive).toHaveBeenCalledWith(true);
        expect(component.lastTriggeredAction()).toBe('immediate-sync');
    });

    it('should trigger drive sync when clicking Check & Merge Drive Sync button', async () => {
        const button = fixture.debugElement.query(By.css('#btn-trigger-drive-sync'));
        expect(button).toBeTruthy();

        button.nativeElement.click();
        fixture.detectChanges();

        expect(mockSyncFromDrive).toHaveBeenCalledTimes(1);
        expect(component.lastTriggeredAction()).toBe('drive-sync');
    });

    it('should generate simulated conflict and update reactive signals and DOM', () => {
        expect(component.conflicts().length).toBe(0);

        const simulateBtn = fixture.debugElement.query(By.css('#btn-simulate-conflict'));
        expect(simulateBtn).toBeTruthy();

        simulateBtn.nativeElement.click();
        fixture.detectChanges();

        expect(component.conflicts().length).toBe(1);
        expect(component.lastTriggeredAction()).toBe('simulate-conflict');

        const conflictBadge = fixture.debugElement.query(By.css('#conflict-count-badge'));
        expect(conflictBadge.nativeElement.textContent).toContain('1 Conflict');

        const conflictItem = fixture.debugElement.query(By.css('[data-testid="conflict-item-0"]'));
        expect(conflictItem).toBeTruthy();
        expect(conflictItem.nativeElement.textContent).toContain('Local Roaster (Mine)');
        expect(conflictItem.nativeElement.textContent).toContain('Local Roaster (Drive)');
    });

    it('should resolve simulated conflict when Keep Mine or Keep Theirs is clicked', async () => {
        component.simulateConflict();
        fixture.detectChanges();
        expect(component.conflicts().length).toBe(1);

        const conflictId = component.conflicts()[0]?.id ?? '';
        const keepMineBtn = fixture.debugElement.query(By.css('#btn-keep-mine-0'));
        expect(keepMineBtn).toBeTruthy();

        keepMineBtn.nativeElement.click();
        fixture.detectChanges();

        expect(mockLedgerStore.resolveConflict).toHaveBeenCalledWith(conflictId, true);
        expect(component.conflicts().length).toBe(0);
    });

    it('should clear all conflicts when Clear All Conflicts is clicked', () => {
        component.simulateConflict();
        component.simulateConflict();
        fixture.detectChanges();
        expect(component.conflicts().length).toBe(2);

        const clearBtn = fixture.debugElement.query(By.css('#btn-clear-conflicts'));
        clearBtn.nativeElement.click();
        fixture.detectChanges();

        expect(component.conflicts().length).toBe(0);
        expect(component.lastTriggeredAction()).toBe('clear-conflicts');
    });

    it('should simulate network status toggling between online and offline', () => {
        expect(component.simulatedNetworkOnline()).toBe(true);

        const toggleBtn = fixture.debugElement.query(By.css('#btn-toggle-network'));
        toggleBtn.nativeElement.click();
        fixture.detectChanges();

        expect(component.simulatedNetworkOnline()).toBe(false);
        expect(component.syncStatus()).toBe('pending-local');
        expect(component.lastTriggeredAction()).toBe('network-offline');

        const networkBadge = fixture.debugElement.query(By.css('#network-status-badge'));
        expect(networkBadge.nativeElement.textContent.trim()).toBe('Offline');

        toggleBtn.nativeElement.click();
        fixture.detectChanges();

        expect(component.simulatedNetworkOnline()).toBe(true);
        expect(component.syncStatus()).toBe('synced');
        expect(component.lastTriggeredAction()).toBe('network-online');
        expect(networkBadge.nativeElement.textContent.trim()).toBe('Online');
    });

    it('should simulate sync error and display error banner', () => {
        const errorBtn = fixture.debugElement.query(By.css('#btn-simulate-error'));
        errorBtn.nativeElement.click();
        fixture.detectChanges();

        expect(component.syncStatus()).toBe('error');
        expect(component.syncError()).toBe('Simulated 503 Service Unavailable');
        expect(component.lastTriggeredAction()).toBe('simulate-error');

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Error: Simulated 503 Service Unavailable');

        const resetBtn = fixture.debugElement.query(By.css('#btn-reset-sync-state'));
        resetBtn.nativeElement.click();
        fixture.detectChanges();

        expect(component.syncStatus()).toBe('synced');
        expect(component.syncError()).toBeNull();
        expect(component.lastTriggeredAction()).toBe('reset-state');
    });
});
