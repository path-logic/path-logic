import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Database,
    Info,
    LucideAngularModule,
    RefreshCw,
    RotateCcw,
    ShieldAlert,
    Tag,
    Trash2,
    Users,
    Wallet,
    XCircle
} from 'lucide-angular';

import { environment } from '../../../../../environments/environment';
import { AppShellComponent } from '../../../../components/layout/app-shell/app-shell.component';
import { factoryResetDrive } from '../../../../lib/storage/GoogleDriveAdapter';
import { clearLocalFallback } from '../../../../lib/storage/LocalPersistenceAdapter';
import {
    deleteCategory,
    deletePayee,
    softDeleteAccount
} from '../../../../lib/storage/SQLiteAdapter';
import { AuthService } from '../../../../services/auth/auth.service';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';

/**
 * Developer tool for environment-level data destruction and entity management.
 * Provides a "Nuclear Option" to wipe all data and a "Database Explorer" for inspection.
 */
@Component({
    selector: 'dev-maintenance',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, RouterLink, AppShellComponent],
    templateUrl: './dev-maintenance.component.html',
    styleUrls: ['./dev-maintenance.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DevMaintenanceComponent {
    private readonly authService = inject(AuthService);
    readonly ledgerStore = inject(LedgerStore);

    // UI State
    readonly isResetting = signal<boolean>(false);
    readonly resetSuccess = signal<boolean | null>(null);
    readonly wasPartial = signal<boolean>(false);
    readonly activeTab = signal<'accounts' | 'payees' | 'categories'>('accounts');
    readonly appEnv = environment.appEnv;

    constructor() {
        // Initialize store on entry if needed
        effect(() => {
            if (!this.ledgerStore.isInitialized()) {
                this.ledgerStore.initialize();
            }
        });
    }

    // Actions
    async handleFactoryReset(): Promise<void> {
        if (
            !confirm(
                'NUCLEAR OPTION: Are you absolutely sure? This will PERMANENTLY destroy all data in this environment (Google Drive & Local). This cannot be undone.'
            )
        ) {
            return;
        }

        this.isResetting.set(true);
        this.resetSuccess.set(null);
        let cloudWipeFailed = false;

        try {
            // 1. Try to Wipe Drive if authenticated
            const token = this.authService.accessToken();
            if (token) {
                try {
                    await factoryResetDrive(token);
                } catch (cloudError) {
                    console.warn(
                        '[Maintenance] Cloud wipe failed, proceeding with local wipe:',
                        cloudError
                    );
                    cloudWipeFailed = true;
                }
            } else {
                console.warn('[Maintenance] No access token found, skipping cloud wipe.');
                cloudWipeFailed = true;
            }

            // 2. Clear Local Cache (IndexedDB)
            await clearLocalFallback();

            // 3. Reset In-Memory Store & SQLite
            this.ledgerStore.reset();

            this.resetSuccess.set(true);
            this.wasPartial.set(cloudWipeFailed);
        } catch (error) {
            console.error('Factory reset failed:', error);
            this.resetSuccess.set(false);
        } finally {
            this.isResetting.set(false);
        }
    }

    async handleForceWipeLocal(): Promise<void> {
        if (
            !confirm(
                'EMERGENCY: Force wipe local data? This skips Google Drive and only clears this device.'
            )
        ) {
            return;
        }

        this.isResetting.set(true);
        try {
            await clearLocalFallback();
            this.ledgerStore.reset();
            this.resetSuccess.set(true);
        } catch (error) {
            console.error('Force wipe failed:', error);
            this.resetSuccess.set(false);
        } finally {
            this.isResetting.set(false);
        }
    }

    async handleDeleteAccount(id: string): Promise<void> {
        if (!confirm('Soft delete this account?')) return;
        softDeleteAccount(id);
        await this.ledgerStore.initialize();
    }

    async handleDeletePayee(id: string): Promise<void> {
        if (!confirm('Mark this payee as deleted?')) return;
        deletePayee(id);
        await this.ledgerStore.initialize();
    }

    async handleDeleteCategory(id: string): Promise<void> {
        if (!confirm('Mark this category as deleted?')) return;
        deleteCategory(id);
        await this.ledgerStore.initialize();
    }

    refreshStore(): void {
        this.ledgerStore.initialize();
    }

    // Lucide Icons
    readonly ArrowLeft = ArrowLeft;
    readonly AlertTriangle = AlertTriangle;
    readonly Trash2 = Trash2;
    readonly Database = Database;
    readonly RotateCcw = RotateCcw;
    readonly ShieldAlert = ShieldAlert;
    readonly CheckCircle2 = CheckCircle2;
    readonly XCircle = XCircle;
    readonly Users = Users;
    readonly Tag = Tag;
    readonly Wallet = Wallet;
    readonly Info = Info;
    readonly RefreshCw = RefreshCw;
}
