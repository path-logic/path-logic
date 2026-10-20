import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { IAccount } from '@core';
import { AccountType } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiAutoCategorizeService } from '../../../services/ai-auto-categorize/ai-auto-categorize.service';
import { GeminiService } from '../../../services/gemini/gemini.service';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { NewAccountDialogComponent } from './new-account-dialog.component';

describe('NewAccountDialogComponent', () => {
    let fixture: ComponentFixture<NewAccountDialogComponent>;
    let component: NewAccountDialogComponent;

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
    let mockLedgerStore: {
        categories: ReturnType<typeof signal<Array<any>>>;
        payees: ReturnType<typeof signal<Array<any>>>;
        transactions: ReturnType<typeof signal<Array<any>>>;
        getCategoryAlias: ReturnType<typeof vi.fn>;
        bulkUpsertPayeesAndAliases: ReturnType<typeof vi.fn>;
        applyReconciliationBatch: ReturnType<typeof vi.fn>;
    };
    let mockGeminiService: {
        hasKey: ReturnType<typeof vi.fn>;
        apiKey: ReturnType<typeof vi.fn>;
    };
    let mockAiService: {
        startBackgroundCategorization: ReturnType<typeof vi.fn>;
        status: ReturnType<typeof signal<string>>;
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

        mockLedgerStore = {
            categories: signal<Array<any>>([]),
            payees: signal<Array<any>>([]),
            transactions: signal<Array<any>>([]),
            getCategoryAlias: vi.fn().mockReturnValue(null),
            bulkUpsertPayeesAndAliases: vi.fn().mockResolvedValue(undefined),
            applyReconciliationBatch: vi.fn().mockResolvedValue(undefined)
        };

        mockGeminiService = {
            hasKey: vi.fn().mockReturnValue(false),
            apiKey: vi.fn().mockReturnValue('')
        };

        mockAiService = {
            startBackgroundCategorization: vi.fn(),
            status: signal('idle')
        };

        mockRouter = {
            navigate: vi.fn().mockResolvedValue(true)
        };

        await TestBed.configureTestingModule({
            imports: [NewAccountDialogComponent],
            providers: [
                { provide: UserSettingsStore, useValue: mockSettingsStore },
                { provide: PostHogService, useValue: mockPostHogService },
                { provide: ImportOrchestrationService, useValue: mockImportService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: AiAutoCategorizeService, useValue: mockAiService },
                { provide: Router, useValue: mockRouter }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(NewAccountDialogComponent);
        component = fixture.componentInstance;
    });

    describe('Component creation and visibility', () => {
        it('should create the component instance', () => {
            fixture.componentRef.setInput('isOpen', false);
            fixture.detectChanges();
            expect(component).toBeTruthy();
            expect(component.step()).toBe('select-type');
            expect(component.selectedType()).toBeNull();
        });

        it('should display dialog contents when isOpen is true', () => {
            fixture.componentRef.setInput('isOpen', true);
            fixture.detectChanges();

            expect(document.body.textContent).toContain('Add New Account');
            expect(document.body.textContent).toContain('Checking');
            expect(document.body.textContent).toContain('Savings');
            expect(document.body.textContent).toContain('Credit Card');
            expect(document.body.textContent).toContain('Cash');
        });

        it('should reset wizard state when isOpen transitions to false', () => {
            fixture.componentRef.setInput('isOpen', true);
            fixture.detectChanges();

            component.handleTypeSelect(AccountType.Checking);
            component.accountName.set('Custom Checking');
            component.institutionName.set('Chase');
            component.initialBalance.set('500');
            fixture.detectChanges();

            expect(component.step()).toBe('enter-details');
            expect(component.selectedType()).toBe(AccountType.Checking);
            expect(component.accountName()).toBe('Custom Checking');

            // Close dialog
            fixture.componentRef.setInput('isOpen', false);
            fixture.detectChanges();

            expect(component.step()).toBe('select-type');
            expect(component.selectedType()).toBeNull();
            expect(component.accountName()).toBe('');
            expect(component.institutionName()).toBe('');
            expect(component.initialBalance()).toBe('');
            expect(component.error()).toBeNull();
            expect(component.createdAccount()).toBeNull();
        });

        it('should emit closed output when handleCancel is called', () => {
            const closedSpy = vi.spyOn(component.closed, 'emit');
            component.handleCancel();
            expect(closedSpy).toHaveBeenCalled();
        });
    });

    describe('Account type selection', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('isOpen', true);
            fixture.detectChanges();
        });

        it('should select Checking and set default name "Main Checking"', () => {
            component.handleTypeSelect(AccountType.Checking);

            expect(component.selectedType()).toBe(AccountType.Checking);
            expect(component.step()).toBe('enter-details');
            expect(component.accountName()).toBe('Main Checking');
            expect(component.isLoan()).toBe(false);
            expect(component.theming().accentBg).toBe('bg-teal-500');
        });

        it('should select Savings and set default name "Savings"', () => {
            component.handleTypeSelect(AccountType.Savings);

            expect(component.selectedType()).toBe(AccountType.Savings);
            expect(component.accountName()).toBe('Savings');
            expect(component.isLoan()).toBe(false);
            expect(component.theming().accentBg).toBe('bg-blue-500');
        });

        it('should select Credit and set default name "Credit Card"', () => {
            component.handleTypeSelect(AccountType.Credit);

            expect(component.selectedType()).toBe(AccountType.Credit);
            expect(component.accountName()).toBe('Credit Card');
            expect(component.isLoan()).toBe(false);
            expect(component.theming().accentBg).toBe('bg-purple-500');
        });

        it('should select Cash and set default name "Cash"', () => {
            component.handleTypeSelect(AccountType.Cash);

            expect(component.selectedType()).toBe(AccountType.Cash);
            expect(component.accountName()).toBe('Cash');
            expect(component.isLoan()).toBe(false);
            expect(component.theming().accentBg).toBe('bg-green-500');
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
        });

        it('should return fallback theming for unmapped type', () => {
            const fallback = component.getTypeTheming('unknown-type' as any);
            expect(fallback.accentBg).toBe('bg-primary');
        });
    });

    describe('Stepper value computation and change', () => {
        it('should compute stepValue correctly for different steps', () => {
            component.step.set('select-type');
            expect(component.stepValue()).toBe(1);

            component.step.set('enter-details');
            expect(component.stepValue()).toBe(2);

            component.step.set('creating');
            expect(component.stepValue()).toBe(2);

            component.step.set('import-data');
            expect(component.stepValue()).toBe(3);
        });

        it('should update step on stepValue change', () => {
            component.onStepValueChange(1);
            expect(component.step()).toBe('select-type');

            component.onStepValueChange(2);
            expect(component.step()).toBe('enter-details');

            component.onStepValueChange(3);
            expect(component.step()).toBe('import-data');

            component.onStepValueChange(undefined);
            expect(component.step()).toBe('import-data');
        });
    });

    describe('Form validation and account creation', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('isOpen', true);
            fixture.detectChanges();
        });

        it('should evaluate isFormValid based on accountName length', () => {
            component.accountName.set('');
            expect(component.isFormValid()).toBe(false);

            component.accountName.set('   ');
            expect(component.isFormValid()).toBe(false);

            component.accountName.set('My Account');
            expect(component.isFormValid()).toBe(true);
        });

        it('should display error if accountName is empty on handleCreate', async () => {
            component.handleTypeSelect(AccountType.Checking);
            component.accountName.set('');

            await component.handleCreate(false);

            expect(component.error()).toBe('Account name is required');
        });

        it('should display error if selectedType is null on handleCreate', async () => {
            component.selectedType.set(null);
            component.accountName.set('Test Account');

            await component.handleCreate(false);

            expect(component.error()).toBe('Account type is required');
            expect(component.step()).toBe('select-type');
        });

        it('should create a standard checking account with positive balance and emit accountCreated and closed', async () => {
            const accountCreatedSpy = vi.spyOn(component.accountCreated, 'emit');
            const closedSpy = vi.spyOn(component.closed, 'emit');

            component.handleTypeSelect(AccountType.Checking);
            component.accountName.set('Checking Account');
            component.institutionName.set('Chase Bank');
            component.initialBalance.set('1250.75');

            await component.handleCreate(false);

            expect(accountCreatedSpy).toHaveBeenCalledTimes(1);
            const created: IAccount = accountCreatedSpy.mock.calls[0]![0];
            expect(created.name).toBe('Checking Account');
            expect(created.type).toBe(AccountType.Checking);
            expect(created.institutionName).toBe('Chase Bank');
            expect(created.clearedBalance).toBe(125075);
            expect(created.pendingBalance).toBe(125075);
            expect(created.isActive).toBe(true);

            expect(closedSpy).toHaveBeenCalledTimes(1);
            expect(mockPostHogService.posthog.capture).toHaveBeenCalledWith('account_created', {
                account_type: AccountType.Checking,
                has_institution_name: true,
                has_initial_balance: true,
                will_import: false
            });
        });

        it('should convert credit card initial balance to negative cents', async () => {
            const accountCreatedSpy = vi.spyOn(component.accountCreated, 'emit');

            component.handleTypeSelect(AccountType.Credit);
            component.accountName.set('My Visa');
            component.initialBalance.set('450.25');

            await component.handleCreate(false);

            const created: IAccount = accountCreatedSpy.mock.calls[0]![0];
            expect(created.type).toBe(AccountType.Credit);
            expect(created.clearedBalance).toBe(-45025);
            expect(created.pendingBalance).toBe(-45025);
        });

        it('should default initial balance to 0 cents when omitted', async () => {
            const accountCreatedSpy = vi.spyOn(component.accountCreated, 'emit');

            component.handleTypeSelect(AccountType.Savings);
            component.accountName.set('My Savings');
            component.initialBalance.set('');

            await component.handleCreate(false);

            const created: IAccount = accountCreatedSpy.mock.calls[0]![0];
            expect(created.clearedBalance).toBe(0);
            expect(created.pendingBalance).toBe(0);
        });

        it('should advance to import-data step when goToImport is true', async () => {
            const closedSpy = vi.spyOn(component.closed, 'emit');

            component.handleTypeSelect(AccountType.Checking);
            component.accountName.set('Checking for Import');

            await component.handleCreate(true);

            expect(mockImportService.reset).toHaveBeenCalled();
            expect(component.step()).toBe('import-data');
            expect(closedSpy).not.toHaveBeenCalled();
            expect(mockPostHogService.posthog.capture).toHaveBeenCalledWith(
                'account_created',
                expect.objectContaining({ will_import: true })
            );
        });
    });

    describe('Loan submission and coordination', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('isOpen', true);
            fixture.detectChanges();
        });

        it('should handle loan submitted with close when loanShouldImport is false', () => {
            const accountCreatedSpy = vi.spyOn(component.accountCreated, 'emit');
            const closedSpy = vi.spyOn(component.closed, 'emit');

            component.loanShouldImport.set(false);

            const mockLoanAccount: IAccount = {
                id: 'acc-loan-1',
                name: 'Mortgage Loan',
                type: AccountType.Mortgage,
                institutionName: 'Rocket Mortgage',
                clearedBalance: -25000000,
                pendingBalance: -25000000,
                isActive: true,
                deletedAt: null,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            };

            component.handleLoanSubmitted(mockLoanAccount);

            expect(component.createdAccount()).toBe(mockLoanAccount);
            expect(accountCreatedSpy).toHaveBeenCalledWith(mockLoanAccount);
            expect(closedSpy).toHaveBeenCalled();
            expect(mockPostHogService.posthog.capture).toHaveBeenCalledWith('account_created', {
                account_type: AccountType.Mortgage,
                has_institution_name: true,
                has_initial_balance: true,
                will_import: false
            });
        });

        it('should advance to import step when loanShouldImport is true', () => {
            component.loanShouldImport.set(true);

            const mockLoanAccount: IAccount = {
                id: 'acc-loan-2',
                name: 'Auto Loan',
                type: AccountType.AutoLoan,
                institutionName: 'Ally',
                clearedBalance: -1500000,
                pendingBalance: -1500000,
                isActive: true,
                deletedAt: null,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            };

            component.handleLoanSubmitted(mockLoanAccount);

            expect(mockImportService.reset).toHaveBeenCalled();
            expect(component.step()).toBe('import-data');
        });

        it('should set loanShouldImport and trigger loanFormRef handleSubmit on submitLoanForm', () => {
            const mockLoanForm = {
                handleSubmit: vi.fn().mockResolvedValue(undefined),
                isValid: vi.fn().mockReturnValue(true)
            };
            vi.spyOn(component, 'loanFormRef').mockReturnValue(mockLoanForm as any);

            component.submitLoanForm(true);

            expect(component.loanShouldImport()).toBe(true);
            expect(mockLoanForm.handleSubmit).toHaveBeenCalled();
            expect(component.isLoanFormValid()).toBe(true);
        });
    });

    describe('Import stage handling', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('isOpen', true);
            fixture.detectChanges();
            component.step.set('import-data');
        });

        it('should reset import service and emit closed on skipImport', () => {
            const closedSpy = vi.spyOn(component.closed, 'emit');

            component.skipImport();

            expect(mockImportService.reset).toHaveBeenCalled();
            expect(closedSpy).toHaveBeenCalled();
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
            const testFile = new File(['!Type:Bank\n'], 'test.qif', { type: 'text/plain' });
            const fakeEvent = {
                preventDefault: vi.fn(),
                dataTransfer: { files: [testFile] }
            } as unknown as DragEvent;

            component.createdAccount.set({ id: 'acc-123' } as any);
            component.onDropZoneDrop(fakeEvent);

            expect(component.isDropZoneActive()).toBe(false);
            expect(mockImportService.startImport).toHaveBeenCalledWith(testFile, 'acc-123', {
                deferCategoryMapping: true
            });
        });

        it('should process file on input file selected', () => {
            const testFile = new File(['!Type:Bank\n'], 'selected.qif', { type: 'text/plain' });
            const fakeEvent = {
                target: {
                    files: [testFile],
                    value: 'selected.qif'
                }
            } as unknown as Event;

            component.createdAccount.set({ id: 'acc-456' } as any);
            component.onImportFileSelected(fakeEvent);

            expect(mockImportService.startImport).toHaveBeenCalledWith(testFile, 'acc-456', {
                deferCategoryMapping: true
            });
            expect((fakeEvent.target as HTMLInputElement).value).toBe('');
        });

        it('should commit import and navigate to account page on finishAfterImport', async () => {
            const closedSpy = vi.spyOn(component.closed, 'emit');
            component.createdAccount.set({ id: 'acc-789' } as any);

            await component.finishAfterImport();

            expect(mockImportService.commitImport).toHaveBeenCalledWith('acc-789');
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/accounts', 'acc-789']);
            expect(closedSpy).toHaveBeenCalled();
        });
    });
});
