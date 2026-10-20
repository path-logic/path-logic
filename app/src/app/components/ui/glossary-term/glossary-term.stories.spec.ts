import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, it } from 'vitest';
import { GlossaryTermComponent } from './glossary-term.component';
import * as stories from './glossary-term.component.stories';

describe('GlossaryTermComponent Stories Interactions', () => {
    let fixture: ComponentFixture<GlossaryTermComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GlossaryTermComponent]
        }).compileComponents();
    });

    it('Default story passes interaction checks', async () => {
        fixture = TestBed.createComponent(GlossaryTermComponent);
        if (stories.Default.args?.term !== undefined) {
            fixture.componentRef.setInput('term', stories.Default.args.term);
        }
        fixture.detectChanges();

        if (stories.Default.play) {
            await stories.Default.play({
                canvasElement: fixture.nativeElement
            } as any);
        }
    });

    it('CustomDefinition story passes interaction checks', async () => {
        fixture = TestBed.createComponent(GlossaryTermComponent);
        if (stories.CustomDefinition.args?.term !== undefined) {
            fixture.componentRef.setInput('term', stories.CustomDefinition.args.term);
        }
        if (stories.CustomDefinition.args?.customDefinition !== undefined) {
            fixture.componentRef.setInput(
                'customDefinition',
                stories.CustomDefinition.args.customDefinition
            );
        }
        fixture.detectChanges();

        if (stories.CustomDefinition.play) {
            await stories.CustomDefinition.play({
                canvasElement: fixture.nativeElement
            } as any);
        }
    });
});
