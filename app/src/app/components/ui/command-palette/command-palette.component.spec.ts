import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AccountType } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiAssistantService } from '../../../services/ai-assistant/ai-assistant.service';
import { CommandPaletteService } from '../../../services/command-palette/command-palette.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { CommandPaletteComponent } from './command-palette.component';

describe('CommandPaletteComponent', () => {
    let component: CommandPaletteComponent;
    let fixture: ComponentFixture<CommandPaletteComponent>;
    let router: { navigateByUrl: ReturnType<typeof vi.fn> };
    let ledgerStore: { accounts: ReturnType<typeof signal> };
    let userSettingsStore: { getSetting: ReturnType<typeof vi.fn> };
    let aiAssistantService: {
        open: ReturnType<typeof vi.fn>;
        sendMessage: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        router = { navigateByUrl: vi.fn() };
        ledgerStore = {
            accounts: signal([
                {
                    id: 'acc-1',
                    name: 'Main Checking',
                    type: AccountType.Checking,
                    institutionName: 'Chase',
                    currency: 'USD',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    clearedBalance: 10000,
                    pendingBalance: 10000
                }
            ])
        };
        userSettingsStore = { getSetting: vi.fn().mockReturnValue('valid-key') };
        aiAssistantService = {
            open: vi.fn(),
            sendMessage: vi.fn().mockResolvedValue(undefined)
        };

        await TestBed.configureTestingModule({
            imports: [CommandPaletteComponent],
            providers: [
                { provide: Router, useValue: router },
                { provide: LedgerStore, useValue: ledgerStore },
                { provide: UserSettingsStore, useValue: userSettingsStore },
                { provide: AiAssistantService, useValue: aiAssistantService },
                CommandPaletteService
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CommandPaletteComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the command palette component', () => {
        expect(component).toBeTruthy();
        expect(component.isOpen()).toBe(false);
    });

    it('should open and close the palette', () => {
        component.open();
        expect(component.isOpen()).toBe(true);
        expect(component.search()).toBe('');

        component.close();
        expect(component.isOpen()).toBe(false);
    });

    it('should toggle when Cmd+K or Ctrl+K is pressed', () => {
        const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
        component.handleGlobalKeydown(event);
        expect(component.isOpen()).toBe(true);

        component.handleGlobalKeydown(event);
        expect(component.isOpen()).toBe(false);
    });

    it('should filter commands by search query', () => {
        component.open();
        component.search.set('Checking');
        fixture.detectChanges();

        const filtered = component.filteredCommands();
        expect(filtered.some(c => c.title === 'Main Checking')).toBe(true);
    });

    it('should navigate up and down with arrow keys', () => {
        component.open();
        fixture.detectChanges();

        const total = component.filteredCommands().length;
        expect(component.selectedIndex()).toBe(0);

        // Arrow down
        const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        component.handleGlobalKeydown(downEvent);
        expect(component.selectedIndex()).toBe(1);

        // Arrow up
        const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        component.handleGlobalKeydown(upEvent);
        expect(component.selectedIndex()).toBe(0);
    });

    it('should execute selected action on Enter', () => {
        component.open();
        fixture.detectChanges();

        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
        component.handleGlobalKeydown(enterEvent);

        expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
        expect(component.isOpen()).toBe(false);
    });

    it('should close on Escape', () => {
        component.open();
        expect(component.isOpen()).toBe(true);

        const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        component.handleGlobalKeydown(escEvent);
        expect(component.isOpen()).toBe(false);
    });
});
