import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { IAccount } from '@core';
import { AccountType } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiAssistantService } from '../../../services/ai-assistant/ai-assistant.service';
import { CommandPaletteService } from '../../../services/command-palette/command-palette.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { CommandPaletteComponent } from './command-palette.component';
import { DefaultOpen, SearchWithAiAction } from './command-palette.component.stories';

describe('CommandPaletteComponent (Storybook Stories)', () => {
    let fixture: ComponentFixture<CommandPaletteComponent>;
    let component: CommandPaletteComponent;

    const sampleAccounts: Array<IAccount> = [
        {
            id: 'acc-1',
            name: 'Everyday Checking',
            type: AccountType.Checking,
            institutionName: 'Chase Bank',
            clearedBalance: 50000,
            pendingBalance: 50000,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            deletedAt: null
        },
        {
            id: 'acc-2',
            name: 'Emergency Fund',
            type: AccountType.Savings,
            institutionName: 'Ally Bank',
            clearedBalance: 100000,
            pendingBalance: 100000,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            deletedAt: null
        }
    ];

    let mockLedgerStore: {
        accounts: ReturnType<typeof signal<Array<IAccount>>>;
    };
    let mockUserSettingsStore: {
        getSetting: ReturnType<typeof vi.fn>;
    };
    let mockAiAssistantService: {
        open: ReturnType<typeof vi.fn>;
        sendMessage: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        mockLedgerStore = {
            accounts: signal<Array<IAccount>>(sampleAccounts)
        };
        mockUserSettingsStore = {
            getSetting: vi.fn((key: string) => (key === 'apiKey' ? 'test-api-key' : null))
        };
        mockAiAssistantService = {
            open: vi.fn(),
            sendMessage: vi.fn().mockResolvedValue(undefined)
        };

        await TestBed.configureTestingModule({
            imports: [CommandPaletteComponent],
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: UserSettingsStore, useValue: mockUserSettingsStore },
                { provide: AiAssistantService, useValue: mockAiAssistantService },
                CommandPaletteService
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CommandPaletteComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('executes DefaultOpen story interaction test', async () => {
        await DefaultOpen.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Everyday Checking');
        component.close();
    });

    it('executes SearchWithAiAction story interaction test', async () => {
        await SearchWithAiAction.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Ask AI:');
        component.close();
    });
});
