import { ChangeDetectionStrategy, Component } from '@angular/core';

import { environment } from '../../../../environments/environment';

/**
 * Corner ribbon banner shown on non-production environments.
 * Renders a diagonal stripe in the top-right corner labelled with the
 * current environment name (e.g. "DEV", "STAGING").
 *
 * Production builds return null so there is zero DOM overhead in prod.
 */
@Component({
    selector: 'env-banner',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (!isProd) {
            <div class="env-ribbon" [attr.data-env]="envLabel">
                <span>{{ envLabel }}</span>
            </div>
        }
    `,
    styles: `
        .env-ribbon {
            position: fixed;
            top: 0;
            right: 0;
            z-index: 9999;
            width: 120px;
            height: 120px;
            overflow: hidden;
            pointer-events: none;
        }

        .env-ribbon span {
            position: absolute;
            top: 28px;
            right: -28px;
            width: 130px;
            padding: 4px 0;
            font-family: 'Outfit', 'Inter', sans-serif;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-align: center;
            text-transform: uppercase;
            transform: rotate(45deg);
            transform-origin: center;
        }

        /* DEV — amber */
        .env-ribbon[data-env='DEV'] span {
            background: #f59e0b;
            color: #1c1410;
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.5);
        }

        /* STAGING — violet */
        .env-ribbon[data-env='STAGING'] span {
            background: #7c3aed;
            color: #fff;
            box-shadow: 0 2px 8px rgba(124, 58, 237, 0.5);
        }

        /* E2E — rose */
        .env-ribbon[data-env='E2E'] span {
            background: #e11d48;
            color: #fff;
            box-shadow: 0 2px 8px rgba(225, 29, 72, 0.5);
        }
    `
})
export class EnvBannerComponent {
    readonly isProd = environment.production || environment.appEnv === 'production';
    readonly envLabel = environment.appEnv.toUpperCase();
}
