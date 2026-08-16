import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    HostListener,
    computed,
    inject,
    signal,
    type WritableSignal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountType } from '@core';
import { AiAssistantService } from '../../../services/ai-assistant/ai-assistant.service';
import { CommandPaletteService } from '../../../services/command-palette/command-palette.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';

export enum CommandCategory {
    Navigation = 'Navigation',
    Accounts = 'Accounts',
    Actions = 'Actions',
    Ai = 'AI Assistant'
}

export interface ICommandItem {
    id: string;
    title: string;
    subtitle?: string;
    category: CommandCategory;
    icon: string;
    shortcut?: string;
    action: () => void;
}

@Component({
    selector: 'app-command-palette',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './command-palette.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommandPaletteComponent {
    private readonly router = inject(Router);
    private readonly ledgerStore = inject(LedgerStore);
    private readonly userSettingsStore = inject(UserSettingsStore);
    private readonly aiAssistantService = inject(AiAssistantService);
    readonly commandPaletteService = inject(CommandPaletteService);

    readonly search = signal<string>('');
    readonly selectedIndex = signal<number>(0);

    get isOpen(): WritableSignal<boolean> {
        return this.commandPaletteService.isOpen;
    }

    readonly hasAiKey = computed<boolean>(() => {
        const key = this.userSettingsStore.getSetting('apiKey');
        return typeof key === 'string' && key.trim().length > 0;
    });

    readonly allCommands = computed<Array<ICommandItem>>(() => {
        const accounts = this.ledgerStore.accounts();
        const currentSearch = this.search().trim();
        const commands: Array<ICommandItem> = [];

        // 1. Navigation
        commands.push(
            {
                id: 'nav-dashboard',
                title: 'Dashboard',
                subtitle: 'Portfolio summary and cashflow projection',
                category: CommandCategory.Navigation,
                icon: 'pi pi-home',
                action: () => this.navigate('/dashboard')
            },
            {
                id: 'nav-accounts',
                title: 'Accounts Portfolio',
                subtitle: 'Manage checking, savings, credit cards & loans',
                category: CommandCategory.Navigation,
                icon: 'pi pi-wallet',
                action: () => this.navigate('/accounts')
            },
            {
                id: 'nav-recurring',
                title: 'Bills & Scheduled',
                subtitle: '2-week cashflow forecast and recurring transactions',
                category: CommandCategory.Navigation,
                icon: 'pi pi-calendar',
                action: () => this.navigate('/recurring')
            },
            {
                id: 'nav-payees',
                title: 'Payee Directory',
                subtitle: 'Manage spenders, recipients and locations',
                category: CommandCategory.Navigation,
                icon: 'pi pi-users',
                action: () => this.navigate('/payees')
            },
            {
                id: 'nav-reports',
                title: 'Reports & Analytics',
                subtitle: 'Spending trends, categorization & net worth',
                category: CommandCategory.Navigation,
                icon: 'pi pi-chart-line',
                action: () => this.navigate('/reports')
            },
            {
                id: 'nav-settings',
                title: 'System Settings',
                subtitle: 'AI assistants, cloud backup & preferences',
                category: CommandCategory.Navigation,
                icon: 'pi pi-cog',
                action: () => this.navigate('/settings')
            }
        );

        // 2. Accounts
        for (const acc of accounts) {
            commands.push({
                id: `acc-${acc.id}`,
                title: acc.name,
                subtitle: `${acc.institutionName || 'Account'} • Ledger`,
                category: CommandCategory.Accounts,
                icon: this.getAccountIcon(acc.type),
                action: () => this.navigate(`/accounts/${acc.id}`)
            });
        }

        // 3. Quick Actions
        commands.push(
            {
                id: 'act-new-account',
                title: 'Add New Account',
                subtitle: 'Open account setup wizard',
                category: CommandCategory.Actions,
                icon: 'pi pi-plus-circle',
                action: () => this.navigate('/accounts')
            },
            {
                id: 'act-new-recurring',
                title: 'Schedule Recurring Bill',
                subtitle: 'Create a new automated recurring transaction',
                category: CommandCategory.Actions,
                icon: 'pi pi-replay',
                action: () => this.navigate('/recurring')
            },
            {
                id: 'act-import',
                title: 'Import QIF / CSV Bank Statement',
                subtitle: 'Upload transaction data directly to ledger',
                category: CommandCategory.Actions,
                icon: 'pi pi-upload',
                action: () => this.navigate('/accounts')
            }
        );

        // 4. AI Assistant
        if (currentSearch.length > 0) {
            if (this.hasAiKey()) {
                commands.unshift({
                    id: 'ai-ask',
                    title: `Ask AI: "${currentSearch}"`,
                    subtitle: 'Query financial assistant using natural language',
                    category: CommandCategory.Ai,
                    icon: 'pi pi-sparkles',
                    action: () => {
                        this.close();
                        this.aiAssistantService.open();
                        void this.aiAssistantService.sendMessage(currentSearch);
                    }
                });
            } else {
                commands.push({
                    id: 'ai-configure',
                    title: 'Configure AI Financial Assistant',
                    subtitle: 'Set up your Gemini/Claude/OpenAI API key in Settings',
                    category: CommandCategory.Ai,
                    icon: 'pi pi-sparkles',
                    action: () => this.navigate('/settings')
                });
            }
        }

        return commands;
    });

    readonly filteredCommands = computed<Array<ICommandItem>>(() => {
        const q = this.search().trim().toLowerCase();
        const all = this.allCommands();
        if (!q) return all;

        return all.filter(
            item =>
                item.title.toLowerCase().includes(q) ||
                (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
                item.category.toLowerCase().includes(q)
        );
    });

    @HostListener('window:keydown', ['$event'])
    handleGlobalKeydown(event: KeyboardEvent): void {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            this.toggle();
            return;
        }

        if (!this.isOpen()) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            this.close();
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            const total = this.filteredCommands().length;
            if (total > 0) {
                this.selectedIndex.update(i => (i + 1) % total);
            }
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            const total = this.filteredCommands().length;
            if (total > 0) {
                this.selectedIndex.update(i => (i - 1 + total) % total);
            }
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            const items = this.filteredCommands();
            const selected = items[this.selectedIndex()];
            if (selected) {
                selected.action();
            }
        }
    }

    open(): void {
        this.search.set('');
        this.selectedIndex.set(0);
        this.isOpen.set(true);
    }

    close(): void {
        this.isOpen.set(false);
    }

    toggle(): void {
        if (this.isOpen()) {
            this.close();
        } else {
            this.open();
        }
    }

    selectItem(item: ICommandItem): void {
        item.action();
    }

    private navigate(url: string): void {
        this.close();
        void this.router.navigateByUrl(url);
    }

    private getAccountIcon(type: AccountType): string {
        switch (type) {
            case AccountType.Checking:
                return 'pi pi-credit-card';
            case AccountType.Savings:
                return 'pi pi-money-bill';
            case AccountType.Credit:
                return 'pi pi-wallet';
            case AccountType.Mortgage:
            case AccountType.AutoLoan:
            case AccountType.PersonalLoan:
                return 'pi pi-home';
            default:
                return 'pi pi-dollar';
        }
    }
}
