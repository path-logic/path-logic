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

@Component({
    standalone: true,
    imports: [AppShellComponent],
    template: `
        <shell [scrollable]="scrollable" [noPadding]="noPadding">
            <div class="test-projected">Projected Content</div>
        </shell>
    `
})
class TestHostComponent {
    scrollable = true;
    noPadding = false;
}

describe('AppShellComponent', () => {
    let fixture: ComponentFixture<AppShellComponent>;
    let component: AppShellComponent;

    const mockIsIdle = signal<boolean>(false);
    const mockStartMonitoring = vi.fn();
    const mockResetTimers = vi.fn();

    const mockSecurityManager = {
        isIdle: mockIsIdle,
        startMonitoring: mockStartMonitoring,
        resetTimers: mockResetTimers
    };

    const mockLedgerStore = {
        accounts: signal<Array<any>>([]),
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
            displayName: 'Test User',
            email: 'test@example.com',
            photoURL: null
        }),
        accessToken: signal<string | null>('valid-access-token'),
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
        apiKey: vi.fn().mockReturnValue('mock-gemini-key')
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
        mockStartMonitoring.mockClear();
        mockResetTimers.mockClear();

        await TestBed.configureTestingModule({
            imports: [AppShellComponent, TestHostComponent],
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

        fixture = TestBed.createComponent(AppShellComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('creates the component and starts security activity monitoring', () => {
        expect(component).toBeTruthy();
        expect(mockStartMonitoring).toHaveBeenCalledTimes(1);
    });

    it('delegates resetTimers to SecurityManagerService', () => {
        component.resetTimers();
        expect(mockResetTimers).toHaveBeenCalledTimes(1);
    });

    it('reflects isIdle signal from SecurityManagerService', () => {
        expect(component.isIdle()).toBe(false);
        mockIsIdle.set(true);
        expect(component.isIdle()).toBe(true);
    });

    it('handles scrollable input correctly', () => {
        expect(component.scrollable()).toBe(true);
        const main = fixture.nativeElement.querySelector('main') as HTMLElement;
        expect(main.classList.contains('overflow-hidden')).toBe(false);

        fixture.componentRef.setInput('scrollable', false);
        fixture.detectChanges();
        expect(main.classList.contains('overflow-hidden')).toBe(true);
    });

    it('handles noPadding input correctly', () => {
        expect(component.noPadding()).toBe(false);
        const contentContainer = fixture.nativeElement.querySelector(
            'main > div > div'
        ) as HTMLElement;
        expect(contentContainer.classList.contains('p-4')).toBe(true);
        expect(contentContainer.classList.contains('max-w-7xl')).toBe(true);

        fixture.componentRef.setInput('noPadding', true);
        fixture.detectChanges();
        expect(contentContainer.classList.contains('p-4')).toBe(false);
        expect(contentContainer.classList.contains('max-w-7xl')).toBe(false);
    });

    it('projects nested template content correctly', () => {
        const hostFixture = TestBed.createComponent(TestHostComponent);
        hostFixture.detectChanges();

        const compiled = hostFixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('.test-projected')).not.toBeNull();
        expect(compiled.textContent).toContain('Projected Content');
    });

    it('renders key layout structural subcomponents', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('security-overlay')).not.toBeNull();
        expect(compiled.querySelector('auth-overlay')).not.toBeNull();
        expect(compiled.querySelector('sidebar-nav')).not.toBeNull();
        expect(compiled.querySelector('breadcrumb-nav')).not.toBeNull();
        expect(compiled.querySelector('ai-assistant-sidebar')).not.toBeNull();
    });
});
