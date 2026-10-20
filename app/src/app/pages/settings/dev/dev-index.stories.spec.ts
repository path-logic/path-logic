import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SecurityManagerService } from '../../../services/security-manager/security-manager.service';
import { SyncService } from '../../../services/sync/sync.service';
import { DevIndexComponent } from './dev-index.component';
import {
    Default,
    InteractiveNavigation,
    mockAuthService,
    mockLedgerStore,
    mockSecurityManager,
    mockSyncService
} from './dev-index.component.stories';

describe('DevIndexComponent (Storybook Stories)', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DevIndexComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuthService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: SyncService, useValue: mockSyncService }
            ]
        }).compileComponents();
    });

    it('renders Default story and executes play function', async () => {
        const fixture: ComponentFixture<DevIndexComponent> =
            TestBed.createComponent(DevIndexComponent);
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Developer Tools');
    });

    it('executes InteractiveNavigation story play function', async () => {
        const fixture: ComponentFixture<DevIndexComponent> =
            TestBed.createComponent(DevIndexComponent);
        fixture.detectChanges();

        await InteractiveNavigation.play?.({
            canvasElement: fixture.nativeElement,
            step: async (_name: string, fn: () => Promise<void>) => {
                await fn();
                fixture.detectChanges();
            }
        } as any);

        expect(fixture.nativeElement.textContent).toContain('Sync Test Suite');
        expect(fixture.nativeElement.textContent).toContain('Auth Diagnostics');
        expect(fixture.nativeElement.textContent).toContain('System Maintenance');
        expect(fixture.nativeElement.textContent).toContain('QIF Import Diagnostics');
    }, 15000);
});
