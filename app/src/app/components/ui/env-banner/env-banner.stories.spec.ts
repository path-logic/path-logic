import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EnvBannerComponent } from './env-banner.component';
import { Default } from './env-banner.component.stories';

describe('EnvBannerComponent (Storybook Stories)', () => {
    let fixture: ComponentFixture<EnvBannerComponent>;
    let component: EnvBannerComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EnvBannerComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(EnvBannerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('executes Default story interaction test', async () => {
        expect(component).toBeTruthy();
        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        if (!component.isProd) {
            const text = fixture.nativeElement.querySelector('.env-text');
            expect(text).toBeTruthy();
            expect(text.textContent.trim().length).toBeGreaterThan(0);
        }
    });
});
