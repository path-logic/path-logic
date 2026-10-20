import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, it } from 'vitest';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { FormGuideComponent } from './form-guide.component';
import * as stories from './form-guide.component.stories';

describe('FormGuideComponent Stories Interactions', () => {
    let fixture: ComponentFixture<FormGuideComponent>;
    let showGuides = true;
    const mockSettingsStore = {
        getSetting: (key: string) => {
            if (key.endsWith('_disabled')) {
                return showGuides ? 'false' : 'true';
            }
            return 'false';
        },
        updateSetting: async (key: string, value: string) => {
            if (key.endsWith('_disabled')) {
                showGuides = value === 'false';
            }
        }
    };

    beforeEach(async () => {
        showGuides = true;
        await TestBed.configureTestingModule({
            imports: [FormGuideComponent],
            providers: [{ provide: UserSettingsStore, useValue: mockSettingsStore }]
        }).compileComponents();
    });

    it('Default story passes interaction checks', async () => {
        fixture = TestBed.createComponent(FormGuideComponent);
        if (stories.Default.args?.guideId !== undefined) {
            fixture.componentRef.setInput('guideId', stories.Default.args.guideId);
        }
        if (stories.Default.args?.targetFieldId !== undefined) {
            fixture.componentRef.setInput('targetFieldId', stories.Default.args.targetFieldId);
        }
        if (stories.Default.args?.content !== undefined) {
            fixture.componentRef.setInput('content', stories.Default.args.content);
        }
        fixture.detectChanges();

        if (stories.Default.play) {
            await stories.Default.play({
                canvasElement: fixture.nativeElement
            } as any);
        }
    });

    it('InactiveBackground story passes interaction checks', async () => {
        fixture = TestBed.createComponent(FormGuideComponent);
        if (stories.InactiveBackground.args?.guideId !== undefined) {
            fixture.componentRef.setInput('guideId', stories.InactiveBackground.args.guideId);
        }
        if (stories.InactiveBackground.args?.targetFieldId !== undefined) {
            fixture.componentRef.setInput(
                'targetFieldId',
                stories.InactiveBackground.args.targetFieldId
            );
        }
        if (stories.InactiveBackground.args?.content !== undefined) {
            fixture.componentRef.setInput('content', stories.InactiveBackground.args.content);
        }
        fixture.detectChanges();

        if (stories.InactiveBackground.play) {
            await stories.InactiveBackground.play({
                canvasElement: fixture.nativeElement
            } as any);
        }
    });

    it('InteractiveDismiss story passes interaction checks', async () => {
        fixture = TestBed.createComponent(FormGuideComponent);
        if (stories.InteractiveDismiss.args?.guideId !== undefined) {
            fixture.componentRef.setInput('guideId', stories.InteractiveDismiss.args.guideId);
        }
        if (stories.InteractiveDismiss.args?.targetFieldId !== undefined) {
            fixture.componentRef.setInput(
                'targetFieldId',
                stories.InteractiveDismiss.args.targetFieldId
            );
        }
        if (stories.InteractiveDismiss.args?.content !== undefined) {
            fixture.componentRef.setInput('content', stories.InteractiveDismiss.args.content);
        }
        fixture.detectChanges();

        if (stories.InteractiveDismiss.play) {
            await stories.InteractiveDismiss.play({
                canvasElement: fixture.nativeElement
            } as any);
        }
    });
});
