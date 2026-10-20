import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiAssistantService } from '../../../services/ai-assistant/ai-assistant.service';
import { AuthService } from '../../../services/auth/auth.service';
import { CommandPaletteService } from '../../../services/command-palette/command-palette.service';
import { GeminiService } from '../../../services/gemini/gemini.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { LlmService } from '../../../services/llm/llm.service';
import { SecurityManagerService } from '../../../services/security-manager/security-manager.service';
import { SidebarContextService } from '../../../services/sidebar-context/sidebar-context.service';
import { SyncService } from '../../../services/sync/sync.service';
import { ThemeService } from '../../../services/theme/theme.service';
import { StyleGuideComponent } from './style-guide.component';
import { Default, InteractiveInputsAndButtons } from './style-guide.component.stories';

describe('StyleGuideComponent Stories Spec Wrapper', () => {
    let fixture: ComponentFixture<StyleGuideComponent>;

    const mockSecurityManager = {
        isIdle: signal<boolean>(false),
        startMonitoring: vi.fn(),
        resetTimers: vi.fn()
    };

    const mockLedgerStore = {
        accounts: signal<Array<any>>([]),
        transactions: signal<Array<any>>([]),
        schedules: signal<Array<any>>([]),
        recurringSchedules: signal<Array<any>>([]),
        categories: signal<Array<any>>([]),
        isInitialized: signal<boolean>(true),
        syncStatus: signal<string>('synced'),
        authError: signal<boolean>(false),
        hasLocalFallback: signal<boolean>(true),
        mergeCount: signal<number>(0),
        syncConflicts: signal<Array<any>>([])
    };

    const mockAuthService = {
        currentUser: signal({
            displayName: 'Dev User',
            email: 'dev@pathlogic.io',
            photoURL: null
        }),
        accessToken: signal<string | null>('mock-token'),
        signOut: vi.fn().mockResolvedValue(undefined),
        signInWithGoogle: vi.fn().mockResolvedValue(undefined)
    };

    const mockSyncService = {
        isSyncing: signal<boolean>(false),
        getSyncStatus: vi.fn().mockReturnValue({ inProgress: false, lastSyncTime: 1700000000000 })
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
        apiKey: vi.fn().mockReturnValue('mock-key')
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
        await TestBed.configureTestingModule({
            imports: [StyleGuideComponent],
            providers: [
                provideRouter([]),
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: SyncService, useValue: mockSyncService },
                { provide: LlmService, useValue: mockLlmService },
                { provide: AiAssistantService, useValue: mockAiAssistantService },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: ThemeService, useValue: mockThemeService },
                { provide: CommandPaletteService, useValue: mockCommandPaletteService },
                { provide: SidebarContextService, useValue: mockSidebarContextService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(StyleGuideComponent);
        fixture.detectChanges();
    });

    it('executes Default story play function', async () => {
        const stepMock = vi.fn(async (_label: string, fn: () => Promise<void>) => await fn());
        await Default.play?.({
            canvasElement: fixture.nativeElement,
            step: stepMock
        } as any);

        expect(stepMock).toHaveBeenCalledTimes(3);
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Visual Constitution');
        expect(compiled.textContent).toContain('§ 2 · Color System');
    });

    it('executes InteractiveInputsAndButtons story play function', async () => {
        const stepMock = vi.fn(async (_label: string, fn: () => Promise<void>) => await fn());
        await InteractiveInputsAndButtons.play?.({
            canvasElement: fixture.nativeElement,
            step: stepMock
        } as any);

        expect(stepMock).toHaveBeenCalledTimes(3);
        const standardInput = fixture.nativeElement.querySelector(
            '#style-guide-standard-input'
        ) as HTMLInputElement;
        expect(standardInput.value).toBe('Path Logic Design Token');
    });
});
