import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { IPayee } from '@core';
import Lara from '@primeuix/themes/lara';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiAssistantService } from '../../services/ai-assistant/ai-assistant.service';
import { AuthService } from '../../services/auth/auth.service';
import { CommandPaletteService } from '../../services/command-palette/command-palette.service';
import { GeminiService } from '../../services/gemini/gemini.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { LlmService } from '../../services/llm/llm.service';
import { SecurityManagerService } from '../../services/security-manager/security-manager.service';
import { SidebarContextService } from '../../services/sidebar-context/sidebar-context.service';
import { SyncService } from '../../services/sync/sync.service';
import { ThemeService } from '../../services/theme/theme.service';
import { UserSettingsStore } from '../../services/user-settings-store/user-settings.store';
import { PayeesPageComponent } from './payees-page.component';
import { Default, EmptyState } from './payees-page.component.stories';

describe('PayeesPageComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<PayeesPageComponent>;

    const mockPayees = signal<Array<IPayee>>([
        {
            id: 'p-1',
            name: 'Austin Energy',
            address: '721 Barton Springs Rd',
            city: 'Austin',
            state: 'TX',
            zipCode: '78704',
            latitude: 30.2601,
            longitude: -97.7508,
            website: 'https://austinenergy.com',
            phone: '512-494-9400',
            notes: 'Electric utility provider',
            defaultCategoryId: 'cat-utilities',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        },
        {
            id: 'p-2',
            name: 'Starbucks Coffee',
            address: '500 W 5th St',
            city: 'Austin',
            state: 'TX',
            zipCode: '78701',
            latitude: 30.2685,
            longitude: -97.7476,
            website: 'https://starbucks.com',
            phone: '512-555-0199',
            notes: 'Downtown coffee shop',
            defaultCategoryId: 'cat-coffee',
            createdAt: '2026-01-02T00:00:00Z',
            updatedAt: '2026-01-02T00:00:00Z'
        },
        {
            id: 'p-3',
            name: 'Starbucks #1234',
            address: '100 Congress Ave',
            city: 'Austin',
            state: 'TX',
            zipCode: '78701',
            latitude: null,
            longitude: null,
            website: null,
            phone: null,
            notes: 'Duplicate espresso bar',
            defaultCategoryId: 'cat-coffee',
            createdAt: '2026-01-03T00:00:00Z',
            updatedAt: '2026-01-03T00:00:00Z'
        }
    ]);

    const mockLedgerStore = {
        payees: mockPayees,
        transactions: signal<Array<any>>([]),
        schedules: signal<Array<any>>([]),
        recurringSchedules: signal<Array<any>>([]),
        accounts: signal<Array<any>>([]),
        categories: signal<Array<any>>([]),
        isInitialized: signal<boolean>(true),
        isLoading: signal<boolean>(false),
        syncStatus: signal<string>('idle'),
        authError: signal<boolean>(false),
        hasLocalFallback: signal<boolean>(true),
        syncConflicts: signal<Array<any>>([]),
        mergeCount: signal<number>(0),
        mergePayees: vi.fn().mockResolvedValue({ affectedTransactions: 1, affectedSchedules: 0 }),
        addPayee: vi.fn().mockResolvedValue(undefined),
        updatePayee: vi.fn().mockResolvedValue(undefined)
    };

    const mockAuthService = {
        currentUser: signal({
            displayName: 'Alex Mercer',
            email: 'alex.mercer@pathlogic.io',
            photoURL: null
        }),
        accessToken: signal<string | null>('valid-token'),
        isLoggedIn: signal<boolean>(true),
        isInitializing: signal<boolean>(false),
        signOut: vi.fn().mockResolvedValue(undefined),
        signInWithGoogle: vi.fn().mockResolvedValue(undefined)
    };

    const mockSecurityManager = {
        isIdle: signal<boolean>(false),
        startMonitoring: vi.fn(),
        resetTimers: vi.fn()
    };

    const mockSyncService = {
        isSyncing: signal<boolean>(false),
        getSyncStatus: () => ({ lastSyncTime: 1700000000000 })
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
        hasKey: () => true,
        apiKey: () => 'mock-api-key'
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

    const mockUserSettingsStore = {
        settings: signal<Record<string, string>>({}),
        isLoading: signal<boolean>(false),
        primaryAccountId: signal<string | null>(null),
        getSetting: vi.fn()
    };

    beforeEach(async () => {
        Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
        await TestBed.configureTestingModule({
            imports: [PayeesPageComponent],
            providers: [
                provideRouter([]),
                providePrimeNG({
                    theme: {
                        preset: Lara,
                        options: {
                            darkModeSelector: '.dark'
                        }
                    }
                }),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: SyncService, useValue: mockSyncService },
                { provide: LlmService, useValue: mockLlmService },
                { provide: AiAssistantService, useValue: mockAiAssistantService },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: ThemeService, useValue: mockThemeService },
                { provide: CommandPaletteService, useValue: mockCommandPaletteService },
                { provide: SidebarContextService, useValue: mockSidebarContextService },
                { provide: UserSettingsStore, useValue: mockUserSettingsStore }
            ]
        }).compileComponents();
    });

    it('executes Default story interaction test', async () => {
        mockPayees.set([
            {
                id: 'p-1',
                name: 'Austin Energy',
                address: '721 Barton Springs Rd',
                city: 'Austin',
                state: 'TX',
                zipCode: '78704',
                latitude: 30.2601,
                longitude: -97.7508,
                website: 'https://austinenergy.com',
                phone: '512-494-9400',
                notes: 'Electric utility provider',
                defaultCategoryId: 'cat-utilities',
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z'
            },
            {
                id: 'p-2',
                name: 'Starbucks Coffee',
                address: '500 W 5th St',
                city: 'Austin',
                state: 'TX',
                zipCode: '78701',
                latitude: 30.2685,
                longitude: -97.7476,
                website: 'https://starbucks.com',
                phone: '512-555-0199',
                notes: 'Downtown coffee shop',
                defaultCategoryId: 'cat-coffee',
                createdAt: '2026-01-02T00:00:00Z',
                updatedAt: '2026-01-02T00:00:00Z'
            },
            {
                id: 'p-3',
                name: 'Starbucks #1234',
                address: '100 Congress Ave',
                city: 'Austin',
                state: 'TX',
                zipCode: '78701',
                latitude: null,
                longitude: null,
                website: null,
                phone: null,
                notes: 'Duplicate espresso bar',
                defaultCategoryId: 'cat-coffee',
                createdAt: '2026-01-03T00:00:00Z',
                updatedAt: '2026-01-03T00:00:00Z'
            }
        ]);
        fixture = TestBed.createComponent(PayeesPageComponent);
        fixture.componentInstance.isMediumOrLarge.set(true);
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Austin Energy');
        expect(fixture.nativeElement.textContent).toContain('Starbucks Coffee');
    }, 15000);

    it('executes EmptyState story interaction test', async () => {
        mockPayees.set([]);
        fixture = TestBed.createComponent(PayeesPageComponent);
        fixture.detectChanges();

        await EmptyState.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('No payees registered yet');
    });
});
