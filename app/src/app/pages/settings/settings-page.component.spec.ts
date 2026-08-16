import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
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
        const mockAuthService = {
            accessToken: signal<string | null>(null),
            currentUser: signal(null),
            isLoggedIn: signal(true),
            isInitializing: signal(false),
            signInWithGoogle: vi.fn()
        };

        await TestBed.configureTestingModule({
            imports: [SettingsPageComponent],
            providers: [
                provideNoopAnimations(),
                provideRouter([]),
                { provide: AuthService, useValue: mockAuthService }
            ]
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

    it('should toggle setup guide visibility', () => {
        expect(component.showGuide()).toBe(false);
        component.showGuide.set(true);
        expect(component.showGuide()).toBe(true);
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
});
