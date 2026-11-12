import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';
import { LlmProvider, LlmService } from '../../services/llm/llm.service';
import { ThemeService } from '../../services/theme/theme.service';
import { UserSettingsStore } from '../../services/user-settings-store/user-settings.store';
import { SettingsPageComponent } from './settings-page.component';

describe('SettingsPageComponent', () => {
    let component: SettingsPageComponent;
    let fixture: ComponentFixture<SettingsPageComponent>;
    let themeService: ThemeService;
    let userSettingsStore: UserSettingsStore;
    let llmService: LlmService;

    beforeEach(async () => {
        if (typeof localStorage !== 'undefined') {
            localStorage.clear();
        }
        const mockAuthService = {
            accessToken: signal<string | null>(null),
            currentUser: signal(null),
            isLoggedIn: signal(true),
            isInitializing: signal(false),
            signInWithGoogle: vi.fn()
        };

        await TestBed.configureTestingModule({
            imports: [SettingsPageComponent],
            providers: [provideRouter([]), { provide: AuthService, useValue: mockAuthService }]
        }).compileComponents();

        fixture = TestBed.createComponent(SettingsPageComponent);
        component = fixture.componentInstance;
        themeService = TestBed.inject(ThemeService);
        userSettingsStore = TestBed.inject(UserSettingsStore);
        llmService = TestBed.inject(LlmService);
        fixture.detectChanges();
    });

    it('should create the settings page component', () => {
        expect(component).toBeTruthy();
    });

    it('should render appearance, AI integration, and backup sections', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Appearance');
        expect(compiled.textContent).toContain('AI Integration');
        expect(compiled.textContent).toContain('Data Backup');
    });

    it('should update theme when theme buttons are clicked', () => {
        const spy = vi.spyOn(themeService, 'setTheme');
        const lightBtn = fixture.nativeElement.querySelector('#theme-btn-light');
        expect(lightBtn).toBeTruthy();

        lightBtn.click();
        expect(spy).toHaveBeenCalledWith('light');
    });

    it('should show correct API key label and placeholder based on selected provider', () => {
        expect(component.apiKeyLabel()).toContain('Gemini');
        expect(component.apiKeyPlaceholder()).toContain('AIzaSy');

        component.updateProvider(LlmProvider.Anthropic);
        expect(component.apiKeyLabel()).toContain('Anthropic');
        expect(component.apiKeyPlaceholder()).toContain('sk-ant');

        component.updateProvider(LlmProvider.OpenAI);
        expect(component.apiKeyLabel()).toContain('OpenAI');
        expect(component.apiKeyPlaceholder()).toContain('sk-proj');
    });

    it('should toggle setup guide popover without shifting layout and dismiss on escape', () => {
        expect(component.showGuide()).toBe(false);
        expect(fixture.nativeElement.querySelector('#provider-setup-guide-popover')).toBeNull();

        component.showGuide.set(true);
        fixture.detectChanges();

        const popover = fixture.nativeElement.querySelector(
            '#provider-setup-guide-popover'
        ) as HTMLElement | null;
        expect(popover).toBeTruthy();
        expect(popover?.className).toContain('absolute');
        expect(popover?.getAttribute('role')).toBe('dialog');

        component.onEscapeKey();
        fixture.detectChanges();
        expect(component.showGuide()).toBe(false);
        expect(fixture.nativeElement.querySelector('#provider-setup-guide-popover')).toBeNull();
    });

    it('should open export and import dialogs', () => {
        expect(component.showExportDialog()).toBe(false);
        expect(component.showImportDialog()).toBe(false);
        expect(component.showExportManagerDialog()).toBe(false);

        component.showExportDialog.set(true);
        expect(component.showExportDialog()).toBe(true);

        component.showImportDialog.set(true);
        expect(component.showImportDialog()).toBe(true);

        component.showExportManagerDialog.set(true);
        expect(component.showExportManagerDialog()).toBe(true);
    });

    it('should toggle dev mode when clicking version 5 times', () => {
        const initialDev = component.devKeySet();
        for (let i = 0; i < 5; i++) {
            component.onVersionClick();
        }
        expect(component.devKeySet()).toBe(!initialDev);
    });

    it('should include or exclude restore backup action and dialog based on isMediumOrLarge signal', () => {
        component.isMediumOrLarge.set(true);
        component.showImportDialog.set(true);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('app-import-dialog')).toBeTruthy();

        component.isMediumOrLarge.set(false);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('app-import-dialog')).toBeNull();
    });

    it('should default and upgrade Gemini model to Gemini 4 Argon when available', async () => {
        userSettingsStore.updateSetting('aiProvider', LlmProvider.Gemini);
        userSettingsStore.updateSetting('aiModel', 'gemini-3.8-flash');
        userSettingsStore.updateSetting('aiModelUserSelected', 'false');

        const listSpy = vi.spyOn(llmService, 'listModels').mockResolvedValue([
            { value: 'gemini-4-argon', label: 'Gemini 4 Argon', isDefault: true },
            { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', isDefault: false }
        ]);

        await component.loadDynamicModels(LlmProvider.Gemini, 'AIzaSyMockKey');

        expect(component.selectedModel()).toBe('gemini-4-argon');
        expect(userSettingsStore.getSetting('aiModel')).toBe('gemini-4-argon');
        expect(userSettingsStore.getSetting('geminiModel')).toBe('gemini-4-argon');

        listSpy.mockRestore();
    });

    it('should toggle API key input visibility between password and text when a key is entered or saved', () => {
        const inputEl = fixture.nativeElement.querySelector(
            'input[autocomplete="off"]'
        ) as HTMLInputElement;
        const toggleBtn = fixture.nativeElement.querySelector(
            'button[aria-label="Show API key"]'
        ) as HTMLButtonElement;

        expect(inputEl).toBeTruthy();
        expect(toggleBtn).toBeTruthy();
        // Disabled when input is empty
        expect(toggleBtn.disabled).toBe(true);
        expect(inputEl.type).toBe('password');

        // Enter a key into the input
        inputEl.value = 'AIzaSyTestSecretKey12345';
        inputEl.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        expect(toggleBtn.disabled).toBe(false);

        // Click to reveal API key
        toggleBtn.click();
        fixture.detectChanges();

        expect(component.showApiKey()).toBe(true);
        expect(inputEl.type).toBe('text');
        expect(inputEl.value).toBe('AIzaSyTestSecretKey12345');

        // Click again to hide API key
        toggleBtn.click();
        fixture.detectChanges();

        expect(component.showApiKey()).toBe(false);
        expect(inputEl.type).toBe('password');
        expect(inputEl.value).toBe('AIzaSyTestSecretKey12345');
    });

    it('should open MS Money migration service and navigate to /settings/mny-migration page', () => {
        const openSpy = vi.spyOn(component.mnyMigrationService, 'open');
        component.openMnyMigration();
        expect(openSpy).toHaveBeenCalled();
        expect(component.showMnyMigrationDialog()).toBe(true);
    });
});
