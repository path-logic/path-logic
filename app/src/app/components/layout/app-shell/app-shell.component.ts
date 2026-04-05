import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { SecurityManagerService } from '../../../services/security-manager/security-manager.service';
import { AuthOverlayComponent } from '../../auth/auth-overlay/auth-overlay.component';
import { SyncPendingBannerComponent } from '../../auth/sync-pending-banner/sync-pending-banner.component';
import { BreadcrumbNavComponent } from '../breadcrumb-nav/breadcrumb-nav.component';
import { FooterComponent } from '../footer/footer.component';
import { HeaderComponent } from '../header/header.component';
import { SecurityOverlayComponent } from '../security-overlay/security-overlay.component';

/**
 * Global application shell that provides the consistent header,
 * Bloomberg-style background, and overflow management.
 */
@Component({
    selector: 'app-shell',
    standalone: true,
    imports: [
        HeaderComponent,
        FooterComponent,
        BreadcrumbNavComponent,
        SecurityOverlayComponent,
        AuthOverlayComponent,
        SyncPendingBannerComponent,
    ],
    templateUrl: './app-shell.component.html',
    styleUrl: './app-shell.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
    private readonly securityManager: SecurityManagerService = inject(SecurityManagerService);

    /**
     * Whether the main content area should be scrollable.
     * Default: true
     */
    readonly scrollable = input<boolean>(true);

    /**
     * Whether to disable default page padding and max-width.
     * Default: false
     */
    readonly noPadding = input<boolean>(false);

    /**
     * Expose isIdle state from security manager.
     */
    readonly isIdle = this.securityManager.isIdle;

    constructor() {
        // Start monitoring user activity for security timeouts
        this.securityManager.startMonitoring();
    }

    /**
     * Resets the security activity timers.
     */
    resetTimers(): void {
        this.securityManager.resetTimers();
    }
}
