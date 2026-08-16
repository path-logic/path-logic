import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    HostListener,
    inject,
    signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { type ITransaction, Money, TransactionStatus } from '@core';
import { filter } from 'rxjs';

import { AiAssistantService } from '../../../services/ai-assistant/ai-assistant.service';
import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { ThemeService } from '../../../services/theme/theme.service';
import { SyncIndicatorComponent } from '../../sync/sync-indicator/sync-indicator.component';
import { BrandLogoComponent } from '../../ui/brand-logo/brand-logo.component';

export interface ISidebarNavItem {
    name: string;
    href: string;
    icon: string;
    badge?: () => string | number | null;
}

/**
 * Vertical sidebar navigation component for the desktop workspace layout.
 */
@Component({
    selector: 'sidebar-nav',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, BrandLogoComponent, SyncIndicatorComponent],
    templateUrl: './sidebar-nav.component.html',
    styleUrl: './sidebar-nav.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarNavComponent {
    private readonly ledgerStore: LedgerStore = inject(LedgerStore);
    private readonly authService: AuthService = inject(AuthService);
    private readonly elementRef: ElementRef = inject(ElementRef);
    private readonly destroyRef: DestroyRef = inject(DestroyRef);
    private readonly router: Router = inject(Router);
    readonly themeService: ThemeService = inject(ThemeService);
    readonly aiAssistantService: AiAssistantService = inject(AiAssistantService);

    readonly isCollapsed = signal<boolean>(false);
    readonly showUserMenu = signal<boolean>(false);

    readonly navItems = new Array<ISidebarNavItem>(
        { name: 'Overview', href: '/', icon: 'pi-objects-column' } satisfies ISidebarNavItem,
        {
            name: 'Accounts',
            href: '/accounts',
            icon: 'pi-wallet',
            badge: (): number | null => {
                const count =
                    typeof this.ledgerStore.accounts === 'function'
                        ? this.ledgerStore.accounts().length
                        : 0;
                return count > 0 ? count : null;
            }
        } satisfies ISidebarNavItem,
        {
            name: 'Recurring',
            href: '/recurring',
            icon: 'pi-replay',
            badge: (): number | null => {
                const count =
                    typeof this.ledgerStore.schedules === 'function'
                        ? this.ledgerStore.schedules().length
                        : 0;
                return count > 0 ? count : null;
            }
        } satisfies ISidebarNavItem,
        { name: 'Payees', href: '/payees', icon: 'pi-users' } satisfies ISidebarNavItem
    );

    readonly netBalance = computed((): number => {
        const txs: Array<ITransaction> =
            typeof this.ledgerStore.transactions === 'function'
                ? this.ledgerStore.transactions()
                : [];
        const cleared: number = txs
            .filter((tx: ITransaction): boolean => tx.status === TransactionStatus.Cleared)
            .reduce((sum: number, tx: ITransaction): number => sum + tx.totalAmount, 0);
        const pending: number = txs
            .filter((tx: ITransaction): boolean => tx.status === TransactionStatus.Pending)
            .reduce((sum: number, tx: ITransaction): number => sum + tx.totalAmount, 0);
        return cleared + pending;
    });

    readonly formattedNetBalance = computed((): string => Money.formatCurrency(this.netBalance()));

    readonly userName = computed(
        (): string => this.authService.currentUser()?.displayName ?? 'User'
    );

    readonly userEmail = computed((): string => this.authService.currentUser()?.email ?? '');

    readonly userPhotoUrl = computed(
        (): string | null => this.authService.currentUser()?.photoURL ?? null
    );

    readonly userInitial = computed((): string => (this.userName().charAt(0) || 'U').toUpperCase());

    constructor() {
        if (typeof window !== 'undefined' && window.localStorage) {
            const savedState = localStorage.getItem('path-logic-sidebar-collapsed');
            if (savedState !== null) {
                this.isCollapsed.set(savedState === 'true');
            }
        }

        this.router.events
            .pipe(
                filter(e => e instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => {
                this.showUserMenu.set(false);
            });
    }

    toggleCollapse(): void {
        this.isCollapsed.update(v => !v);
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('path-logic-sidebar-collapsed', String(this.isCollapsed()));
        }
    }

    @HostListener('document:click', ['$event?.target'])
    onDocumentClick(target: EventTarget | null | undefined): void {
        if (!this.elementRef.nativeElement.contains(target)) {
            if (this.showUserMenu()) {
                this.showUserMenu.set(false);
            }
        }
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        this.showUserMenu.set(false);
    }

    toggleUserMenu(): void {
        this.showUserMenu.update(v => !v);
    }

    toggleTheme(): void {
        const current = this.themeService.resolvedTheme();
        this.themeService.setTheme(current === 'dark' ? 'light' : 'dark');
    }

    toggleAiAssistant(): void {
        this.aiAssistantService.toggle();
    }

    signOut(): void {
        this.showUserMenu.set(false);
        this.authService.signOut();
    }
}
