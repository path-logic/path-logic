import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { CorruptionRecoveryDialogComponent } from './corruption-recovery-dialog.component';
import { Default } from './corruption-recovery-dialog.component.stories';

describe('CorruptionRecoveryDialogComponent (Storybook Interaction Spec Wrapper)', () => {
    it('executes Default story interaction test', async () => {
        await TestBed.configureTestingModule({
            imports: [CorruptionRecoveryDialogComponent]
        }).compileComponents();

        const fixture: ComponentFixture<CorruptionRecoveryDialogComponent> =
            TestBed.createComponent(CorruptionRecoveryDialogComponent);
        fixture.componentRef.setInput('folderName', Default.args?.folderName);
        fixture.componentRef.setInput('report', Default.args?.report);
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Data Integrity Mismatch');
        expect(fixture.nativeElement.textContent).toContain('20260808');
        expect(fixture.nativeElement.textContent).toContain('Checking Account');
    });
});
