import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowLeft, CheckCircle2, Key, LogOut, LucideAngularModule, Shield } from 'lucide-angular';

import { AppShellComponent } from '../../../../components/layout/app-shell/app-shell.component';
import { AuthService } from '../../../../services/auth/auth.service';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';

/**
 * Developer diagnostic page for Authentication.
 * Displays session metadata and allows simulating auth states.
 */
@Component({
    selector: 'app-dev-auth',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, RouterLink, AppShellComponent],
    templateUrl: './dev-auth.component.html',
    styleUrls: ['./dev-auth.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevAuthComponent {
    private readonly authService = inject(AuthService);
    private readonly ledgerStore = inject(LedgerStore);

    // Signals
    readonly user = this.authService.currentUser;
    readonly isLoggedIn = this.authService.isLoggedIn;
    readonly accessToken = this.authService.accessToken;
    readonly authError = this.ledgerStore.authError;

    // Computed
    readonly sessionInfo = computed(() => {
        const u = this.user();
        if (!u) return 'No active session';
        return JSON.stringify(
            {
                uid: u.uid,
                email: u.email,
                displayName: u.displayName,
                emailVerified: u.emailVerified,
                isAnonymous: u.isAnonymous,
                metadata: u.metadata,
                providerData: u.providerData,
                accessToken: this.accessToken() ? '***' + this.accessToken()?.slice(-8) : 'MISSING',
            },
            null,
            2,
        );
    });

    // Actions
    async signIn(): Promise<void> {
        await this.authService.signInWithGoogle();
    }

    async signOut(): Promise<void> {
        await this.authService.signOut();
    }

    setSimulatedError(error: boolean): void {
        this.ledgerStore.authError.set(error);
    }

    // Lucide Icons
    readonly Shield = Shield;
    readonly Key = Key;
    readonly LogOut = LogOut;
    readonly CheckCircle2 = CheckCircle2;
    readonly ArrowLeft = ArrowLeft;
}
