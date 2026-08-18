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
            <div class="env-corner-tag" aria-hidden="true">
                <svg viewBox="0 0 80 80" class="env-corner-svg">
                    <polygon points="0,0 80,0 80,80" [attr.fill]="bannerBg" />
                    <text
                        x="52"
                        y="28"
                        transform="rotate(45 52 28)"
                        [attr.fill]="bannerText"
                        text-anchor="middle"
                        dominant-baseline="central"
                        class="env-text"
                    >
                        {{ envLabel }}
                    </text>
                </svg>
            </div>
        }
    `,
    styles: `
        .env-corner-tag {
            position: fixed;
            top: 0;
            right: 0;
            z-index: 9999;
            width: 50px;
            height: 50px;
            overflow: hidden;
            pointer-events: none;
        }

        .env-corner-svg {
            width: 100%;
            height: 100%;
            filter: drop-shadow(-2px 3px 6px rgba(0, 0, 0, 0.3));
        }

        .env-text {
            font-family:
                'Outfit',
                'Inter',
                system-ui,
                -apple-system,
                sans-serif;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.14em;
            text-transform: uppercase;
        }
    `
})
export class EnvBannerComponent {
    readonly isProd = environment.production || environment.appEnv === 'production';
    readonly envLabel = ENV_LABELS[environment.appEnv] ?? environment.appEnv.toUpperCase();
    readonly bannerBg = environment.theme.bannerBg;
    readonly bannerText = environment.theme.bannerText;
}
