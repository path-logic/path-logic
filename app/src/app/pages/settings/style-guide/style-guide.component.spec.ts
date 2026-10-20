import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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

describe('StyleGuideComponent', () => {
    let fixture: ComponentFixture<StyleGuideComponent>;
    let component: StyleGuideComponent;

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
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the style guide component', () => {
        expect(component).toBeTruthy();
    });

    it('should render page title and brand identity section', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Visual Constitution');
        expect(compiled.textContent).toContain('§ 1 · Wordmark & Identity');
        expect(compiled.textContent).toContain('Color Split Rule');
    });

    it('should render the typography specifications and font roles', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('§ 3 · Typography System');
        expect(compiled.textContent).toContain('Outfit');
        expect(compiled.textContent).toContain('Inter');
        expect(compiled.textContent).toContain('JetBrains Mono');

        // Check specimen text
        expect(compiled.textContent).toContain('Financial Intelligence');
        expect(compiled.textContent).toContain('Account Ledger');
        expect(compiled.textContent).toContain('CLEARED BALANCE');
        expect(compiled.textContent).toContain('Tabular Numbers — Mandatory');
    });

    it('should render all semantic, dark, and light color swatches', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('§ 2 · Color System');

        // Semantic tokens
        for (const swatch of component.semanticSwatches) {
            expect(compiled.textContent).toContain(swatch.token);
            expect(compiled.textContent).toContain(swatch.hex);
        }

        // Dark tokens
        for (const swatch of component.darkSwatches) {
            expect(compiled.textContent).toContain(swatch.token);
            expect(compiled.textContent).toContain(swatch.hex);
        }

        // Light tokens
        for (const swatch of component.lightSwatches) {
            expect(compiled.textContent).toContain(swatch.token);
            expect(compiled.textContent).toContain(swatch.hex);
        }
    });

    it('should render button specimens in all states', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        const buttons = compiled.querySelectorAll('button');
        const buttonTexts = Array.from(buttons).map(b => b.textContent?.trim());

        expect(buttonTexts).toContain('Primary');
        expect(buttonTexts).toContain('Secondary');
        expect(buttonTexts).toContain('Danger');
        expect(buttonTexts).toContain('Ghost');
        expect(buttonTexts).toContain('Disabled');

        const disabledButton = Array.from(buttons).find(b => b.textContent?.trim() === 'Disabled');
        expect(disabledButton?.hasAttribute('disabled')).toBe(true);
    });

    it('should render input field specimens with standard, disabled, and currency variants', () => {
        const standardInput = fixture.debugElement.query(By.css('#style-guide-standard-input'));
        expect(standardInput).toBeTruthy();
        expect(standardInput.nativeElement.getAttribute('placeholder')).toBe('Enter text...');

        const disabledInput = fixture.debugElement.query(By.css('#style-guide-disabled-input'));
        expect(disabledInput).toBeTruthy();
        expect(disabledInput.nativeElement.hasAttribute('disabled')).toBe(true);
        expect(disabledInput.nativeElement.value).toBe('Read-only value');

        const currencyInput = fixture.debugElement.query(By.css('#style-guide-currency-input'));
        expect(currencyInput).toBeTruthy();
        expect(currencyInput.nativeElement.getAttribute('placeholder')).toBe('0.00');
    });

    it('should render status badges for transaction and account states', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Cleared');
        expect(compiled.textContent).toContain('Pending');
        expect(compiled.textContent).toContain('Overdue');
        expect(compiled.textContent).toContain('Scheduled');
        expect(compiled.textContent).toContain('Inactive');
    });

    it('should render layout rules and accessibility guidelines', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('§ 5 · Layout & Density Rules');
        expect(compiled.textContent).toContain('Grid & Spacing');
        expect(compiled.textContent).toContain('Data Density');

        expect(compiled.textContent).toContain('§ 7 · Accessibility Standards');
        expect(compiled.textContent).toContain('Color Independence');
        expect(compiled.textContent).toContain('Contrast Ratios');
        expect(compiled.textContent).toContain('Focus Rings');
    });
});
