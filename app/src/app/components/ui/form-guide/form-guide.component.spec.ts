import type { WritableSignal } from '@angular/core';
import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { FormGuideComponent } from './form-guide.component';

describe('FormGuideComponent', () => {
    let component: FormGuideComponent;
    let fixture: ComponentFixture<FormGuideComponent>;
    let settingsSignal: WritableSignal<Record<string, string>>;
    let mockSettingsStore: {
        settings: WritableSignal<Record<string, string>>;
        getSetting: (key: string) => string | undefined;
        updateSetting: ReturnType<typeof vi.fn>;
    };

    const mockContent: Record<
        string,
        { title: string; description: string; tips?: Array<string> }
    > = {
        interestRate: {
            title: 'Interest Rate',
            description: 'Enter the annual percentage rate (APR) provided by your lender.',
            tips: ['Check your loan estimate for accuracy', 'Fixed rates remain constant']
        },
        loanAmount: {
            title: 'Loan Amount',
            description: 'The principal balance remaining on your loan.'
        }
    };

    beforeEach(async () => {
        settingsSignal = signal<Record<string, string>>({});
        const updateSettingSpy = vi.fn(async (key: string, value: string) => {
            settingsSignal.update(s => ({ ...s, [key]: value }));
        });
        mockSettingsStore = {
            settings: settingsSignal,
            getSetting: (key: string) => settingsSignal()[key] ?? 'false',
            updateSetting: updateSettingSpy
        };

        await TestBed.configureTestingModule({
            imports: [FormGuideComponent],
            providers: [{ provide: UserSettingsStore, useValue: mockSettingsStore }]
        }).compileComponents();

        fixture = TestBed.createComponent(FormGuideComponent);
        component = fixture.componentInstance;

        fixture.componentRef.setInput('guideId', 'mortgage-guide');
        fixture.componentRef.setInput('targetFieldId', 'interestRate');
        fixture.componentRef.setInput('content', mockContent);
        fixture.detectChanges();
    });

    it('should create the form guide component', () => {
        expect(component).toBeTruthy();
        expect(component.isVisible()).toBe(true);
        expect(component.isDisabled()).toBe(false);
        expect(component.activeGuide()?.title).toBe('Interest Rate');
    });

    describe('Rendering Active Guide and Tips', () => {
        it('should render header, title, description, and tips', () => {
            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.textContent).toContain('Intelligence Guide');
            expect(compiled.textContent).toContain('Interest Rate');
            expect(compiled.textContent).toContain('Enter the annual percentage rate');
            expect(compiled.textContent).toContain('Pro Tips');
            expect(compiled.textContent).toContain('Check your loan estimate for accuracy');
            expect(compiled.textContent).toContain('Fixed rates remain constant');
        });

        it('should omit tips section when no tips exist for active field', () => {
            fixture.componentRef.setInput('targetFieldId', 'loanAmount');
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.textContent).toContain('Loan Amount');
            expect(compiled.textContent).not.toContain('Pro Tips');
        });

        it('should apply custom className input to container', () => {
            fixture.componentRef.setInput('className', 'custom-class-123');
            fixture.detectChanges();

            const container = fixture.nativeElement.querySelector('.fixed');
            expect(container.className).toContain('custom-class-123');
        });
    });

    describe('Target Field Changes and Inactivity', () => {
        it('should not render guide when targetFieldId is null', () => {
            fixture.componentRef.setInput('targetFieldId', null);
            fixture.detectChanges();

            expect(component.activeGuide()).toBeNull();
            const guide = fixture.nativeElement.querySelector('.fixed');
            expect(guide).toBeNull();
        });

        it('should not render guide when targetFieldId is not in content map', () => {
            fixture.componentRef.setInput('targetFieldId', 'unknownField');
            fixture.detectChanges();

            expect(component.activeGuide()).toBeNull();
            const guide = fixture.nativeElement.querySelector('.fixed');
            expect(guide).toBeNull();
        });
    });

    describe('Closing Guide (handleClose)', () => {
        it('should hide guide on close button click without disabling setting in store', () => {
            const closeBtn = fixture.nativeElement.querySelector(
                'button[aria-label="Close Guide"]'
            ) as HTMLButtonElement;
            closeBtn.click();
            fixture.detectChanges();

            expect(component.isVisible()).toBe(false);
            expect(mockSettingsStore.updateSetting).not.toHaveBeenCalled();
            const guide = fixture.nativeElement.querySelector('.fixed');
            expect(guide).toBeNull();
        });
    });

    describe('Disabling and Enabling Guide', () => {
        it('should persist disabled state in store and render sparkle enable button on handleDisable', () => {
            const disableBtn = fixture.nativeElement.querySelector(
                'button[aria-label="Disable Intelligence Guide"]'
            ) as HTMLButtonElement;
            disableBtn.click();
            fixture.detectChanges();

            expect(mockSettingsStore.updateSetting).toHaveBeenCalledWith(
                'guide_mortgage-guide_disabled',
                'true'
            );
            expect(component.isVisible()).toBe(false);
            expect(component.isDisabled()).toBe(true);

            // Sparkle button for enabling should be rendered
            const enableBtn = fixture.nativeElement.querySelector(
                'button[aria-label="Enable Intelligence Guide"]'
            );
            expect(enableBtn).toBeTruthy();
            expect(enableBtn.querySelector('.pi-sparkles')).toBeTruthy();
        });

        it('should enable guide and clear disabled setting on handleEnable', () => {
            // Start in disabled state
            settingsSignal.set({ 'guide_mortgage-guide_disabled': 'true' });
            fixture.detectChanges();

            const enableBtn = fixture.nativeElement.querySelector(
                'button[aria-label="Enable Intelligence Guide"]'
            ) as HTMLButtonElement;
            enableBtn.click();
            fixture.detectChanges();

            expect(mockSettingsStore.updateSetting).toHaveBeenCalledWith(
                'guide_mortgage-guide_disabled',
                'false'
            );
            expect(component.isVisible()).toBe(true);
            expect(component.isDisabled()).toBe(false);
            expect(fixture.nativeElement.textContent).toContain('Intelligence Guide');
        });
    });

    describe('Re-opening on Focus Effect', () => {
        it('should automatically set isVisible to true when targetFieldId changes if not disabled', () => {
            component.handleClose();
            fixture.detectChanges();
            expect(component.isVisible()).toBe(false);

            // Focus changes to loanAmount
            fixture.componentRef.setInput('targetFieldId', 'loanAmount');
            fixture.detectChanges();

            expect(component.isVisible()).toBe(true);
            expect(component.activeGuide()?.title).toBe('Loan Amount');
        });
    });
});
