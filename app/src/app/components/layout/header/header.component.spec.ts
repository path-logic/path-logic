import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AiAssistantService } from '../../../services/ai-assistant/ai-assistant.service';
import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { ThemeService } from '../../../services/theme/theme.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
    let component: HeaderComponent;
    let fixture: ComponentFixture<HeaderComponent>;

    const mockAuthService = {
        currentUser: signal({
            displayName: 'Test User',
            email: 'test@example.com',
            photoURL: null
        }),
        signOut: vi.fn().mockResolvedValue(undefined)
    };

    const mockLedgerStore = {
        transactions: signal([]),
        isInitialized: signal(true)
    };

    const mockThemeService = {
        resolvedTheme: signal('light'),
        toggleTheme: vi.fn()
    };

    const mockAiAssistantService = {
        toggle: vi.fn()
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HeaderComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuthService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: ThemeService, useValue: mockThemeService },
                { provide: AiAssistantService, useValue: mockAiAssistantService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(HeaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the header component', () => {
        expect(component).toBeTruthy();
    });

    it('should toggle mobile menu visibility', () => {
        expect(component.showMobileMenu()).toBe(false);
        component.toggleMobileMenu();
        expect(component.showMobileMenu()).toBe(true);
        component.toggleMobileMenu();
        expect(component.showMobileMenu()).toBe(false);
    });

    it('should close mobile menu on Escape key press', () => {
        component.showMobileMenu.set(true);
        fixture.detectChanges();

        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        document.dispatchEvent(event);
        fixture.detectChanges();

        expect(component.showMobileMenu()).toBe(false);
    });

    it('should render mobile menu overlay and backdrop when open', () => {
        component.showMobileMenu.set(true);
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        const backdrop = element.querySelector('.fixed.inset-0');
        const overlay = element.querySelector('.absolute.top-full');

        expect(backdrop).toBeTruthy();
        expect(overlay).toBeTruthy();
    });
});
