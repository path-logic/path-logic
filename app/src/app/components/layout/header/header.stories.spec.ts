import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TransactionStatus } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiAssistantService } from '../../../services/ai-assistant/ai-assistant.service';
import { AuthService } from '../../../services/auth/auth.service';
import { CommandPaletteService } from '../../../services/command-palette/command-palette.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { ThemeService } from '../../../services/theme/theme.service';
import { HeaderComponent } from './header.component';
import { Default, NegativeBalance, NoDisplayName } from './header.component.stories';

describe('HeaderComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<HeaderComponent>;

    const transactionsSignal = signal<Array<any>>([
        { status: TransactionStatus.Cleared, totalAmount: 1500000 },
        { status: TransactionStatus.Pending, totalAmount: -50000 }
    ]);

    const userSignal = signal<{
        displayName: string | null;
        email: string;
        photoURL: string | null;
    } | null>({
        displayName: 'Jane Doe',
        email: 'jane@example.com',
        photoURL: null
    });

    const mockLedgerStore = {
        transactions: transactionsSignal,
        isInitialized: signal<boolean>(true)
    };

    const mockAuthService = {
        currentUser: userSignal,
        signOut: vi.fn().mockResolvedValue(undefined)
    };

    const mockThemeService = {
        resolvedTheme: signal<string>('light'),
        setTheme: vi.fn()
    };

    const mockAiAssistantService = {
        toggle: vi.fn(),
        isOpen: signal<boolean>(false)
    };

    const mockCommandPaletteService = {
        open: vi.fn(),
        close: vi.fn(),
        isOpen: signal<boolean>(false)
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HeaderComponent],
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: ThemeService, useValue: mockThemeService },
                { provide: AiAssistantService, useValue: mockAiAssistantService },
                { provide: CommandPaletteService, useValue: mockCommandPaletteService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(HeaderComponent);
        fixture.detectChanges();
    });

    it('executes Default story interaction test', async () => {
        transactionsSignal.set([
            { status: TransactionStatus.Cleared, totalAmount: 1500000 },
            { status: TransactionStatus.Pending, totalAmount: -50000 }
        ]);
        userSignal.set({
            displayName: 'Jane Doe',
            email: 'jane@example.com',
            photoURL: null
        });
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Jane Doe');
        expect(fixture.nativeElement.textContent).toContain('$14,500.00');
    });

    it('executes NegativeBalance story interaction test', async () => {
        transactionsSignal.set([
            { status: TransactionStatus.Cleared, totalAmount: -50000 },
            { status: TransactionStatus.Pending, totalAmount: -20000 }
        ]);
        fixture.detectChanges();

        await NegativeBalance.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('-$700.00');
    });

    it('executes NoDisplayName story interaction test', async () => {
        transactionsSignal.set([
            { status: TransactionStatus.Cleared, totalAmount: 0 },
            { status: TransactionStatus.Pending, totalAmount: 0 }
        ]);
        userSignal.set({
            displayName: null,
            email: 'anonymous@example.com',
            photoURL: null
        });
        fixture.detectChanges();

        await NoDisplayName.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('User');
    });
});
