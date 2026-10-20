import { Component, signal } from '@angular/core';
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
import { AppShellComponent } from './app-shell.component';
import {
    Default,
    NoPaddingFullScreen,
    NonScrollable,
    SessionLocked
} from './app-shell.component.stories';

@Component({
    standalone: true,
    imports: [AppShellComponent],
    template: `
        <shell [scrollable]="scrollable" [noPadding]="noPadding">
            @if (isDefault) {
                <div class="space-y-4">
                    <h1 class="text-xl font-bold">Financial Command Center</h1>
                    <p class="text-sm text-surface-500">
                        Welcome to Path Logic local-first accounting.
                    </p>
                </div>
            }
            @if (isNoPadding) {
                <div class="h-full w-full bg-surface-100 p-8 flex items-center justify-center">
                    <span class="text-base font-semibold">Full Canvas Data Visualization</span>
                </div>
            }
            @if (isNonScrollable) {
                <div class="h-full flex flex-col justify-between">
                    <div>Fixed Header Section</div>
                    <div>Fixed Footer Section</div>
                </div>
            }
            @if (isLocked) {
                <div>Sensitive Financial Data Protected Behind Lock Screen</div>
            }
        </shell>
    `
})
class ShellStoryTestHostComponent {
    scrollable = true;
    noPadding = false;
    isDefault = true;
    isNoPadding = false;
    isNonScrollable = false;
    isLocked = false;
}

describe('AppShellComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<ShellStoryTestHostComponent>;
    let host: ShellStoryTestHostComponent;

    const mockIsIdle = signal<boolean>(false);
    const mockSecurityManager = {
        isIdle: mockIsIdle,
        startMonitoring: vi.fn(),
        resetTimers: vi.fn()
    };

    const mockLedgerStore = {
        accounts: signal<Array<any>>([
            {
                id: 'acc-1',
                name: 'Checking Account',
                type: 'checking',
                institutionName: 'Chase',
                currency: 'USD',
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01'
            }
        ]),
        transactions: signal<Array<any>>([]),
        schedules: signal<Array<any>>([]),
        recurringSchedules: signal<Array<any>>([]),
        categories: signal<Array<any>>([]),
        isInitialized: signal<boolean>(true),
        syncStatus: signal<string>('idle'),
        authError: signal<boolean>(false),
        hasLocalFallback: signal<boolean>(true),
        mergeCount: signal<number>(0),
        syncConflicts: signal<Array<any>>([])
    };

    const mockAuthService = {
        currentUser: signal({
            displayName: 'Alex Morgan',
            email: 'alex.morgan@pathlogic.io',
            photoURL: null
        }),
        accessToken: signal<string | null>('valid-token'),
        signOut: vi.fn().mockResolvedValue(undefined),
        signInWithGoogle: vi.fn().mockResolvedValue(undefined)
    };

    const mockSyncService = {
        isSyncing: signal<boolean>(false),
        getSyncStatus: vi.fn().mockReturnValue({ lastSyncTime: 1700000000000 })
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
        apiKey: vi.fn().mockReturnValue('mock-api-key')
    };

    const mockThemeService = {
        resolvedTheme: signal<string>('light'),
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
        mockIsIdle.set(false);

        await TestBed.configureTestingModule({
            imports: [ShellStoryTestHostComponent],
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

        fixture = TestBed.createComponent(ShellStoryTestHostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('executes Default story interaction test', async () => {
        host.isDefault = true;
        host.isNoPadding = false;
        host.isNonScrollable = false;
        host.isLocked = false;
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Financial Command Center');
    });

    it('executes NoPaddingFullScreen story interaction test', async () => {
        host.isDefault = false;
        host.isNoPadding = true;
        host.isNonScrollable = false;
        host.isLocked = false;
        host.noPadding = true;
        fixture.detectChanges();

        await NoPaddingFullScreen.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Full Canvas Data Visualization');
    });

    it('executes NonScrollable story interaction test', async () => {
        host.isDefault = false;
        host.isNoPadding = false;
        host.isNonScrollable = true;
        host.isLocked = false;
        host.scrollable = false;
        fixture.detectChanges();

        await NonScrollable.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Fixed Header Section');
    });

    it('executes SessionLocked story interaction test', async () => {
        host.isDefault = false;
        host.isNoPadding = false;
        host.isNonScrollable = false;
        host.isLocked = true;
        mockIsIdle.set(true);
        fixture.detectChanges();

        await SessionLocked.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Session Paused');
    });
});
