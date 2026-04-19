import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { environment } from '../environments/environment';
import { AuthService } from './services/auth/auth.service';
import { LedgerStore } from './services/ledger-store/ledger.store';
import { SyncService } from './services/sync/sync.service';

@Component({
    imports: [RouterOutlet],
    selector: 'root',
    template: `<router-outlet />`,
    styles: `
        :host {
            display: block;
            min-height: 100vh;
        }
    `
})
export class AppComponent {
    // CI/CD Trigger: Standardized branch triggers and staging deployment.
    readonly title = 'Path Logic';

    private readonly authService = inject(AuthService);
    private readonly syncService = inject(SyncService);
    private readonly ledgerStore = inject(LedgerStore);

    constructor() {
        // Automatically load database once user is logged in
        effect(() => {
            console.log('[AppComponent] Effect triggered checking auth state for DB init...');
            try {
                const isLoggedIn = this.authService.isLoggedIn();
                const initialized = this.ledgerStore.isInitialized();

                console.log(`[AppComponent] Auth: ${isLoggedIn}, DB Init: ${initialized}`);

                if (isLoggedIn && !initialized) {
                    console.log(
                        '[AppComponent] User is logged in but DB not initialized. Attempting initialization...'
                    );
                    if (environment.e2e) {
                        console.log(
                            '[AppComponent] Environment is E2E, skipping Drive load and initializing local SQL.js only.'
                        );
                        this.ledgerStore
                            .initialize()
                            .catch(e =>
                                console.error(
                                    '[AppComponent] Fatal error initializing ledger store in E2E:',
                                    e
                                )
                            );
                    } else {
                        console.log(
                            '[AppComponent] Attempting to run SyncService.loadFromDrive()...'
                        );
                        this.syncService
                            .loadFromDrive()
                            .then(() => {
                                console.log(
                                    '[AppComponent] Successfully ran loadFromDrive pipeline.'
                                );
                            })
                            .catch(e => {
                                console.error(
                                    '[AppComponent] Fatal error running SyncService.loadFromDrive:',
                                    e
                                );
                            });
                    }
                }
            } catch (error) {
                console.error('[AppComponent] Fatal synchronous error in root effect:', error);
            }
        });
    }
}
