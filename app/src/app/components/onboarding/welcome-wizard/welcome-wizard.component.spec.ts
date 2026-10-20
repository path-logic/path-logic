import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { IAccount } from '@core';
import { AccountType } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { WelcomeWizardComponent } from './welcome-wizard.component';

describe('WelcomeWizardComponent', () => {
    let fixture: ComponentFixture<WelcomeWizardComponent>;
    let component: WelcomeWizardComponent;

    let mockSettingsStore: {
        getSetting: ReturnType<typeof vi.fn>;
        updateSetting: ReturnType<typeof vi.fn>;
    };
    let mockPostHogService: {
        posthog: {
            capture: ReturnType<typeof vi.fn>;
        };
    };
    let mockImportService: {
        progress: ReturnType<
            typeof signal<{
                stage: string;
                pct: number;
                processed: number;
                total: number;
                tier: string;
            }>
        >;
        stats: ReturnType<typeof signal<any>>;
        unknownCategories: ReturnType<typeof signal<Array<string>>>;
        reset: ReturnType<typeof vi.fn>;
        startImport: ReturnType<typeof vi.fn>;
        commitImport: ReturnType<typeof vi.fn>;
    };
    let mockRouter: {
        navigate: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        mockSettingsStore = {
            getSetting: vi.fn().mockReturnValue('false'),
            updateSetting: vi.fn()
        };

        mockPostHogService = {
            posthog: {
                capture: vi.fn()
            }
        };

        mockImportService = {
            progress: signal({
                stage: 'idle',
                pct: 0,
                processed: 0,
                total: 0,
                tier: 'small'
            }),
            stats: signal(null),
            unknownCategories: signal<Array<string>>([]),
            reset: vi.fn(),
            startImport: vi.fn(),
            commitImport: vi.fn().mockResolvedValue([])
        };

        mockRouter = {
            navigate: vi.fn().mockResolvedValue(true)
        };

        await TestBed.configureTestingModule({
            imports: [WelcomeWizardComponent],
            providers: [
                { provide: UserSettingsStore, useValue: mockSettingsStore },
                { provide: PostHogService, useValue: mockPostHogService },
                { provide: ImportOrchestrationService, useValue: mockImportService },
                { provide: Router, useValue: mockRouter }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(WelcomeWizardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    describe('Component creation and initialization', () => {
        it('should create the component instance with default state', () => {
            expect(component).toBeTruthy();
            expect(component.step()).toBe('select-type');
            expect(component.selectedType()).toBeNull();
            expect(component.stepValue()).toBe(1);
            expect(component.selectedOption()).toBeNull();
            expect(component.isLoan()).toBe(false);
        });

        it('should render welcome title and primary account type cards', () => {
            const text = fixture.nativeElement.textContent;
            expect(text).toContain('Welcome to Path Logic');
            expect(text).toContain('Checking Account');
            expect(text).toContain('Savings Account');
            expect(text).toContain('Credit Card');
            expect(text).toContain('Cash');
        });
    });

    describe('Type selection and theming', () => {
        it('should select Checking and prefill "Main Checking"', () => {
            component.handleTypeSelect(AccountType.Checking);

            expect(component.selectedType()).toBe(AccountType.Checking);
            expect(component.step()).toBe('enter-details');
            expect(component.accountName()).toBe('Main Checking');
            expect(component.initialBalance()).toBe('');
            expect(component.isLoan()).toBe(false);
            expect(component.theming().accentBg).toBe('bg-teal-500');
            expect(component.selectedOption()?.label).toBe('Checking Account');
        });

        it('should select Savings and prefill "Savings"', () => {
            component.handleTypeSelect(AccountType.Savings);

            expect(component.selectedType()).toBe(AccountType.Savings);
            expect(component.accountName()).toBe('Savings');
            expect(component.isLoan()).toBe(false);
            expect(component.theming().accentBg).toBe('bg-blue-500');
            expect(component.selectedOption()?.label).toBe('Savings Account');
        });

        it('should select Credit and prefill "Credit Card"', () => {
            component.handleTypeSelect(AccountType.Credit);

            expect(component.selectedType()).toBe(AccountType.Credit);
            expect(component.accountName()).toBe('Credit Card');
            expect(component.isLoan()).toBe(false);
            expect(component.theming().accentBg).toBe('bg-purple-500');
            expect(component.selectedOption()?.label).toBe('Credit Card');
        });

        it('should select Cash and prefill "Cash"', () => {
            component.handleTypeSelect(AccountType.Cash);

            expect(component.selectedType()).toBe(AccountType.Cash);
            expect(component.accountName()).toBe('Cash');
            expect(component.isLoan()).toBe(false);
            expect(component.theming().accentBg).toBe('bg-green-500');
            expect(component.selectedOption()?.label).toBe('Cash');
        });

        it('should toggle loan types visibility', () => {
            expect(component.showLoans()).toBe(false);
            component.showLoans.set(true);
            expect(component.showLoans()).toBe(true);
        });

        it('should select Mortgage loan and recognize isLoan as true', () => {
            component.handleTypeSelect(AccountType.Mortgage);

            expect(component.selectedType()).toBe(AccountType.Mortgage);
            expect(component.isLoan()).toBe(true);
            expect(component.theming().accentBg).toBe('bg-amber-500');
            expect(component.selectedOption()?.label).toBe('Mortgage');
        });

        it('should return fallback theming for unmapped type', () => {
            const fallback = component.getTypeTheming('unknown-type' as any);
            expect(fallback.accentBg).toBe('bg-primary');
        });
    });

    describe('Stepper value and navigation', () => {
        it('should compute stepValue correctly', () => {
            component.step.set('select-type');
            expect(component.stepValue()).toBe(1);

            component.step.set('enter-details');
            expect(component.stepValue()).toBe(2);

            component.step.set('import-data');
            expect(component.stepValue()).toBe(3);
        });

        it('should update step on onStepValueChange', () => {
            component.onStepValueChange(1);
            expect(component.step()).toBe('select-type');

            component.onStepValueChange(2);
            expect(component.step()).toBe('enter-details');

            component.onStepValueChange(3);
            expect(component.step()).toBe('import-data');

            component.onStepValueChange(undefined);
            expect(component.step()).toBe('import-data');
        });

        it('should go back to select-type and clear error on handleBack', () => {
            component.handleTypeSelect(AccountType.Checking);
            component.error.set('Something went wrong');

            component.handleBack();

            expect(component.step()).toBe('select-type');
            expect(component.error()).toBeNull();
        });
    });

    describe('Account creation flow', () => {
        it('should show error when accountName is empty', () => {
            component.handleTypeSelect(AccountType.Checking);
            component.accountName.set('');

            component.handleStandardAccountCreate(false);

            expect(component.error()).toBe('Account name is required');
        });

        it('should show error when selectedType is null', () => {
            component.selectedType.set(null);
            component.accountName.set('Test Account');

            component.handleStandardAccountCreate(false);

            expect(component.error()).toBe('Please select an account type');
        });

        it('should create standard checking account, emit accountCreated and wizardCompleted', () => {
            const accountCreatedSpy = vi.spyOn(component.accountCreated, 'emit');
            const wizardCompletedSpy = vi.spyOn(component.wizardCompleted, 'emit');

            component.handleTypeSelect(AccountType.Checking);
            component.accountName.set('Primary Checking');
            component.initialBalance.set('2500.50');

            component.handleStandardAccountCreate(false);

            expect(accountCreatedSpy).toHaveBeenCalledTimes(1);
            const created: IAccount = accountCreatedSpy.mock.calls[0]![0];
            expect(created.name).toBe('Primary Checking');
            expect(created.type).toBe(AccountType.Checking);
            expect(created.clearedBalance).toBe(250050);
            expect(created.pendingBalance).toBe(250050);
            expect(created.isActive).toBe(true);

            expect(wizardCompletedSpy).toHaveBeenCalledTimes(1);
            expect(mockPostHogService.posthog.capture).toHaveBeenCalledWith(
                'onboarding_account_created',
                {
                    account_type: AccountType.Checking,
                    has_initial_balance: true,
                    will_import: false
                }
            );
        });

        it('should convert credit card initial balance to negative cents', () => {
            const accountCreatedSpy = vi.spyOn(component.accountCreated, 'emit');

            component.handleTypeSelect(AccountType.Credit);
            component.accountName.set('Sapphire Card');
            component.initialBalance.set('800.20');

            component.handleStandardAccountCreate(false);

            const created: IAccount = accountCreatedSpy.mock.calls[0]![0];
            expect(created.clearedBalance).toBe(-80020);
            expect(created.pendingBalance).toBe(-80020);
        });

        it('should handle account creation with import selected', () => {
            const wizardCompletedSpy = vi.spyOn(component.wizardCompleted, 'emit');

            component.handleTypeSelect(AccountType.Checking);
            component.accountName.set('Import Checking');

            component.handleStandardAccountCreate(true);

            expect(mockImportService.reset).toHaveBeenCalled();
            expect(component.step()).toBe('import-data');
            expect(wizardCompletedSpy).not.toHaveBeenCalled();
            expect(mockPostHogService.posthog.capture).toHaveBeenCalledWith(
                'onboarding_account_created',
                expect.objectContaining({ will_import: true })
            );
        });
    });

    describe('Import step in welcome wizard', () => {
        beforeEach(() => {
            component.step.set('import-data');
        });

        it('should reset import service and emit wizardCompleted on skipImport', () => {
            const wizardCompletedSpy = vi.spyOn(component.wizardCompleted, 'emit');

            component.skipImport();

            expect(mockImportService.reset).toHaveBeenCalled();
            expect(wizardCompletedSpy).toHaveBeenCalled();
        });

        it('should handle drop zone drag over and leave', () => {
            const fakeEvent = { preventDefault: vi.fn() } as unknown as DragEvent;

            component.onDropZoneDragOver(fakeEvent);
            expect(fakeEvent.preventDefault).toHaveBeenCalled();
            expect(component.isDropZoneActive()).toBe(true);

            component.onDropZoneDragLeave();
            expect(component.isDropZoneActive()).toBe(false);
        });

        it('should process file on drop zone drop', () => {
            const testFile = new File(['!Type:Bank\n'], 'data.qif', { type: 'text/plain' });
            const fakeEvent = {
                preventDefault: vi.fn(),
                dataTransfer: { files: [testFile] }
            } as unknown as DragEvent;

            component.createdAccount.set({ id: 'acc-ww-1' } as any);
            component.onDropZoneDrop(fakeEvent);

            expect(component.isDropZoneActive()).toBe(false);
            expect(mockImportService.startImport).toHaveBeenCalledWith(testFile, 'acc-ww-1', {
                deferCategoryMapping: true
            });
        });

        it('should process file on input file selected', () => {
            const testFile = new File(['!Type:Bank\n'], 'data2.qif', { type: 'text/plain' });
            const fakeEvent = {
                target: {
                    files: [testFile],
                    value: 'data2.qif'
                }
            } as unknown as Event;

            component.createdAccount.set({ id: 'acc-ww-2' } as any);
            component.onImportFileSelected(fakeEvent);

            expect(mockImportService.startImport).toHaveBeenCalledWith(testFile, 'acc-ww-2', {
                deferCategoryMapping: true
            });
            expect((fakeEvent.target as HTMLInputElement).value).toBe('');
        });

        it('should commit import and navigate on finishAfterImport', async () => {
            const wizardCompletedSpy = vi.spyOn(component.wizardCompleted, 'emit');
            component.createdAccount.set({ id: 'acc-ww-3' } as any);

            await component.finishAfterImport();

            expect(mockImportService.commitImport).toHaveBeenCalledWith('acc-ww-3');
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/accounts', 'acc-ww-3']);
            expect(wizardCompletedSpy).toHaveBeenCalled();
        });

        it('should emit wizardCompleted when finishAfterImport has no accountId', async () => {
            const wizardCompletedSpy = vi.spyOn(component.wizardCompleted, 'emit');
            component.createdAccount.set(null);

            await component.finishAfterImport();

            expect(mockImportService.commitImport).not.toHaveBeenCalled();
            expect(wizardCompletedSpy).toHaveBeenCalled();
        });
    });
});
