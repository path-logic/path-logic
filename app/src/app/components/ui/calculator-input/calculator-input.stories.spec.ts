import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, it } from 'vitest';
import { CalculatorInputComponent } from './calculator-input.component';
import * as stories from './calculator-input.component.stories';

describe('CalculatorInputComponent Stories Interactions', () => {
    let fixture: ComponentFixture<CalculatorInputComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CalculatorInputComponent]
        }).compileComponents();
    });

    it('Default story passes interaction checks', async () => {
        fixture = TestBed.createComponent(CalculatorInputComponent);
        if (stories.Default.args?.placeholder !== undefined) {
            fixture.componentRef.setInput('placeholder', stories.Default.args.placeholder);
        }
        if (stories.Default.args?.disabled !== undefined) {
            fixture.componentRef.setInput('disabled', stories.Default.args.disabled);
        }
        if (stories.Default.args?.prefix !== undefined) {
            fixture.componentRef.setInput('prefix', stories.Default.args.prefix);
        }
        fixture.detectChanges();

        if (stories.Default.play) {
            await stories.Default.play({
                canvasElement: fixture.nativeElement
            } as any);
        }
    });

    it('FilledValue story passes interaction checks', async () => {
        fixture = TestBed.createComponent(CalculatorInputComponent);
        if (stories.FilledValue.args?.placeholder !== undefined) {
            fixture.componentRef.setInput('placeholder', stories.FilledValue.args.placeholder);
        }
        if (stories.FilledValue.args?.prefix !== undefined) {
            fixture.componentRef.setInput('prefix', stories.FilledValue.args.prefix);
        }
        if (stories.FilledValue.args?.value !== undefined) {
            fixture.componentRef.setInput('value', stories.FilledValue.args.value);
        }
        fixture.detectChanges();

        if (stories.FilledValue.play) {
            await stories.FilledValue.play({
                canvasElement: fixture.nativeElement
            } as any);
        }
    });

    it('WithCalculation story passes interaction checks', async () => {
        fixture = TestBed.createComponent(CalculatorInputComponent);
        if (stories.WithCalculation.args?.placeholder !== undefined) {
            fixture.componentRef.setInput('placeholder', stories.WithCalculation.args.placeholder);
        }
        if (stories.WithCalculation.args?.prefix !== undefined) {
            fixture.componentRef.setInput('prefix', stories.WithCalculation.args.prefix);
        }
        fixture.detectChanges();

        if (stories.WithCalculation.play) {
            await stories.WithCalculation.play({
                canvasElement: fixture.nativeElement
            } as any);
        }
    });

    it('Disabled story passes interaction checks', async () => {
        fixture = TestBed.createComponent(CalculatorInputComponent);
        if (stories.Disabled.args?.placeholder !== undefined) {
            fixture.componentRef.setInput('placeholder', stories.Disabled.args.placeholder);
        }
        if (stories.Disabled.args?.disabled !== undefined) {
            fixture.componentRef.setInput('disabled', stories.Disabled.args.disabled);
        }
        if (stories.Disabled.args?.prefix !== undefined) {
            fixture.componentRef.setInput('prefix', stories.Disabled.args.prefix);
        }
        if (stories.Disabled.args?.value !== undefined) {
            fixture.componentRef.setInput('value', stories.Disabled.args.value);
        }
        fixture.detectChanges();

        if (stories.Disabled.play) {
            await stories.Disabled.play({
                canvasElement: fixture.nativeElement
            } as any);
        }
    });
});
