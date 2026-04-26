import { ChangeDetectionStrategy, Component } from '@angular/core';

import { environment } from '../../../../environments/environment';

const ENV_LABELS: Record<string, string> = {
    development: 'DEV',
    staging: 'STG',
    e2e: 'E2E'
};

/**
 * Corner ribbon banner shown on non-production environments.
 * Renders a diagonal stripe in the top-right corner labelled with the
 * current environment name (e.g. "DEV", "STG").
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
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
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
        }

        /* STG — violet */
        .env-ribbon[data-env='STG'] span {
            background: #7c3aed;
            color: #fff;
        }

        /* E2E — rose */
        .env-ribbon[data-env='E2E'] span {
            background: #e11d48;
            color: #fff;
        }
    `
})
export class EnvBannerComponent {
    readonly isProd = environment.production || environment.appEnv === 'production';
    readonly envLabel = ENV_LABELS[environment.appEnv] ?? environment.appEnv.toUpperCase();
}
