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
import {
    BarChart3,
    Calendar,
    CreditCard,
    Home,
    LucideAngularModule,
    Settings,
    Users
} from 'lucide-angular';
import { filter } from 'rxjs';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';

/**
 * Interface for navigation items within the header.
 */
export interface INavItem {
    name: string;
    href: string;
    icon: object;
}

/**
 * Main application header component with navigation and user profile.
 */
@Component({
    selector: 'header',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, LucideAngularModule],
    templateUrl: './header.component.html',
    styleUrl: './header.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
    private readonly ledgerStore: LedgerStore = inject(LedgerStore);
    private readonly authService: AuthService = inject(AuthService);
    private readonly elementRef: ElementRef = inject(ElementRef);
    private readonly destroyRef: DestroyRef = inject(DestroyRef);
    private readonly router: Router = inject(Router);

    readonly showUserMenu = signal<boolean>(false);

    constructor() {
        // Close menu on any navigation
        this.router.events
            .pipe(
                filter(e => e instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => this.showUserMenu.set(false));
    }

    /** Close the menu when clicking outside the host element. */
    @HostListener('document:click', ['$event?.target'])
    onDocumentClick(target: EventTarget | null | undefined): void {
        if (this.showUserMenu() && !this.elementRef.nativeElement.contains(target)) {
            this.showUserMenu.set(false);
        }
    }

    /**
     * List of navigation links shown in the header.
     */
    readonly navItems = new Array<INavItem>(
        { name: 'Overview', href: '/', icon: Home } satisfies INavItem,
        { name: 'Accounts', href: '/accounts', icon: CreditCard } satisfies INavItem,
        { name: 'Payees', href: '/payees', icon: Users } satisfies INavItem,
        { name: 'Recurring', href: '/recurring', icon: Calendar } satisfies INavItem,
        { name: 'Reports', href: '#', icon: BarChart3 } satisfies INavItem,
        { name: 'Settings', href: '/settings', icon: Settings } satisfies INavItem
    );

    readonly netBalance = computed((): number => {
        const txs: Array<ITransaction> = this.ledgerStore.transactions();
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

    readonly userInitial = computed((): string => this.userName().charAt(0).toUpperCase());

    /**
     * Toggles the visibility of the user profile dropdown menu.
     */
    toggleUserMenu(): void {
        this.showUserMenu.update(v => !v);
    }

    /**
     * Initiates the sign-out flow and closes the menu.
     */
    handleSignOut(): void {
        this.showUserMenu.set(false);
        void this.authService.signOut();
    }
}
