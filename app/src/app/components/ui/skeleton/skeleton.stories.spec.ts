import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, it } from 'vitest';
import { SkeletonComponent } from './skeleton.component';
import * as stories from './skeleton.component.stories';
import { SkeletonShape } from './skeleton.types';

describe('SkeletonComponent Stories Interactions', () => {
    let fixture: ComponentFixture<SkeletonComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SkeletonComponent]
        }).compileComponents();
    });

    it('Default story passes interaction checks', async () => {
        fixture = TestBed.createComponent(SkeletonComponent);
        fixture.componentRef.setInput(
            'shape',
            stories.Default.args?.shape ?? SkeletonShape.Rectangle
        );
        fixture.componentRef.setInput('width', stories.Default.args?.width ?? '200px');
        fixture.componentRef.setInput('height', stories.Default.args?.height ?? '24px');
        fixture.detectChanges();

        if (stories.Default.play) {
            await stories.Default.play({
                canvasElement: fixture.nativeElement
            } as any);
        }
    });

    it('CircleAvatar story passes interaction checks', async () => {
        fixture = TestBed.createComponent(SkeletonComponent);
        fixture.componentRef.setInput(
            'shape',
            stories.CircleAvatar.args?.shape ?? SkeletonShape.Circle
        );
        fixture.componentRef.setInput('width', stories.CircleAvatar.args?.width ?? '48px');
        fixture.componentRef.setInput('height', stories.CircleAvatar.args?.height ?? '48px');
        fixture.detectChanges();

        if (stories.CircleAvatar.play) {
            await stories.CircleAvatar.play({
                canvasElement: fixture.nativeElement
            } as any);
        }
    });

    it('TextLine story passes interaction checks', async () => {
        fixture = TestBed.createComponent(SkeletonComponent);
        fixture.componentRef.setInput('shape', stories.TextLine.args?.shape ?? SkeletonShape.Text);
        fixture.componentRef.setInput('width', stories.TextLine.args?.width ?? '100%');
        fixture.detectChanges();

        if (stories.TextLine.play) {
            await stories.TextLine.play({
                canvasElement: fixture.nativeElement
            } as any);
        }
    });

    it('CardLayout story passes interaction checks', async () => {
        fixture = TestBed.createComponent(SkeletonComponent);
        fixture.componentRef.setInput(
            'shape',
            stories.CardLayout.args?.shape ?? SkeletonShape.Card
        );
        fixture.componentRef.setInput('width', stories.CardLayout.args?.width ?? '320px');
        fixture.componentRef.setInput('height', stories.CardLayout.args?.height ?? '180px');
        fixture.detectChanges();

        if (stories.CardLayout.play) {
            await stories.CardLayout.play({
                canvasElement: fixture.nativeElement
            } as any);
        }
    });
});
