import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { ConflictResolutionModalComponent } from './conflict-resolution-modal.component';
import {
    BulkResolution,
    Default,
    InteractiveResolution,
    mockLedgerStore
} from './conflict-resolution-modal.component.stories';

describe('ConflictResolutionModalComponent (Storybook Stories)', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ConflictResolutionModalComponent],
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        }).compileComponents();
    });

    it('renders Default story', () => {
        const fixture: ComponentFixture<ConflictResolutionModalComponent> = TestBed.createComponent(
            ConflictResolutionModalComponent
        );
        fixture.detectChanges();

        expect(Default).toBeDefined();
        const header = document.querySelector('#conflict-modal-title');
        expect(header?.textContent).toContain('Sync Conflicts Detected');
    });

    it('executes InteractiveResolution story interaction test', async () => {
        const fixture: ComponentFixture<ConflictResolutionModalComponent> = TestBed.createComponent(
            ConflictResolutionModalComponent
        );
        fixture.detectChanges();

        await InteractiveResolution.play?.({ canvasElement: fixture.nativeElement } as any);

        const header = document.querySelector('#conflict-modal-title');
        expect(header?.textContent).toContain('Sync Conflicts Detected');
    }, 15000);

    it('executes BulkResolution story interaction test', async () => {
        const fixture: ComponentFixture<ConflictResolutionModalComponent> = TestBed.createComponent(
            ConflictResolutionModalComponent
        );
        fixture.detectChanges();

        await BulkResolution.play?.({ canvasElement: fixture.nativeElement } as any);

        const header = document.querySelector('#conflict-modal-title');
        expect(header?.textContent).toContain('Sync Conflicts Detected');
    }, 15000);
});
