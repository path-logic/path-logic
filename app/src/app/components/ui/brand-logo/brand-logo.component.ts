import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

export type BrandLogoSize = 'sm' | 'md' | 'lg';
export type BrandLogoVariant = 'full' | 'icon-only' | 'stacked';
export type BrandLogoEnv = 'dev' | 'staging' | 'prod';

export function getBrandLogoSvg(color: string, maskId = 'pl-cut'): string {
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
    <rect width="100" height="100" fill="white" />
    <path d="M63.89,22.72 L41.96,29.77 L47.78,36.48 A48.68,48.68 0 0 1 18.46,51.81 L0.11,58.19 L0.11,111.9 L31.44,111.9 L31.44,80.57 L45.99,78.89 C46.66,76.54 45.09,72.73 43.64,68.93 C42.74,63.78 42.97,58.86 45.77,54.05 C46.55,52.48 47.44,50.02 48,48.23 Q48.56,45.77 52.48,42.19 Q56.96,44.87 59.31,48.45 C62.55,44.42 64.9,35.25 66.35,25.74Z" fill="black" />
  </mask>
  <circle cx="50.47" cy="39.16" r="37.15" fill="${color}" mask="url(#${maskId})" />
  <path d="M36.59,52.15 L17.34,61.1 Q12.42,63.34 12.42,68.04 L12.42,95.56 Q12.42,98.02 14.88,98.02 L33.23,98.02 Q35.58,98.02 35.58,95.67 L36.93,53.71Z" fill="${color}" />
</svg>
    `.trim();
}

@Component({
    selector: 'brand-logo',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div [class]="containerClasses()" aria-label="Path Logic">
            <div [class]="badgeClasses()">
                <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-full h-full"
                >
                    <mask
                        id="pl-cut"
                        maskUnits="userSpaceOnUse"
                        x="0"
                        y="0"
                        width="100"
                        height="100"
                    >
                        <rect width="100" height="100" fill="white" />
                        <path
                            d="M63.89,22.72 L41.96,29.77 L47.78,36.48 A48.68,48.68 0 0 1 18.46,51.81 L0.11,58.19 L0.11,111.9 L31.44,111.9 L31.44,80.57 L45.99,78.89 C46.66,76.54 45.09,72.73 43.64,68.93 C42.74,63.78 42.97,58.86 45.77,54.05 C46.55,52.48 47.44,50.02 48,48.23 Q48.56,45.77 52.48,42.19 Q56.96,44.87 59.31,48.45 C62.55,44.42 64.9,35.25 66.35,25.74Z"
                            fill="black"
                        />
                    </mask>
                    <circle
                        cx="50.47"
                        cy="39.16"
                        r="37.15"
                        [attr.fill]="fillColor()"
                        mask="url(#pl-cut)"
                    />
                    <path
                        d="M36.59,52.15 L17.34,61.1 Q12.42,63.34 12.42,68.04 L12.42,95.56 Q12.42,98.02 14.88,98.02 L33.23,98.02 Q35.58,98.02 35.58,95.67 L36.93,53.71Z"
                        [attr.fill]="fillColor()"
                    />
                </svg>
            </div>
            @if (computedVariant() !== 'icon-only') {
                <div
                    class="brand-wordmark flex flex-col justify-between select-none tracking-tighter font-black"
                    [class.items-center]="computedVariant() === 'stacked'"
                    [class.items-start]="computedVariant() !== 'stacked'"
                    [class.text-center]="computedVariant() === 'stacked'"
                >
                    <span [class]="pathTextClasses()">PATH</span>
                    <span [class]="logicTextClasses()">LOGIC</span>
                </div>
            }
        </div>
    `
})
export class BrandLogoComponent {
    private readonly _size = signal<BrandLogoSize>('md');
    private readonly _variant = signal<BrandLogoVariant>('full');
    private readonly _env = signal<BrandLogoEnv | undefined>(undefined);
    private readonly _color = signal<string | undefined>(undefined);

    @Input()
    set size(val: BrandLogoSize) {
        if (val) this._size.set(val);
    }
    get size(): BrandLogoSize {
        return this._size();
    }

    @Input()
    set variant(val: BrandLogoVariant) {
        if (val) this._variant.set(val);
    }
    get variant(): BrandLogoVariant {
        return this._variant();
    }

    @Input()
    set env(val: BrandLogoEnv | undefined) {
        this._env.set(val);
    }
    get env(): BrandLogoEnv | undefined {
        return this._env();
    }

    @Input()
    set color(val: string | undefined) {
        this._color.set(val);
    }
    get color(): string | undefined {
        return this._color();
    }

    readonly computedVariant = computed(() => this._variant());

    readonly fillColor = computed(() => {
        const customColor = this._color();
        if (customColor) return customColor;

        const environment = this._env();
        switch (environment) {
            case 'dev':
                return '#3b82f6';
            case 'staging':
                return '#f97316';
            case 'prod':
                return '#a855f7';
            default:
                return '#1D61E0';
        }
    });

    readonly containerClasses = computed(() => {
        const base = 'inline-flex items-center select-none group';
        return this._variant() === 'stacked' ? `${base} flex-col gap-2` : `${base} gap-2`;
    });

    readonly badgeClasses = computed(() => {
        const base =
            'brand-badge flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105';
        switch (this._size()) {
            case 'sm':
                return `${base} w-5 h-5`;
            case 'lg':
                return `${base} w-12 h-12`;
            case 'md':
            default:
                return `${base} w-8 h-8`;
        }
    });

    readonly pathTextClasses = computed(() => {
        const base =
            'font-black uppercase tracking-tighter text-slate-900 dark:text-slate-100 leading-[0.85]';
        switch (this._size()) {
            case 'sm':
                return `${base} text-[10px]`;
            case 'lg':
                return `${base} text-[20px]`;
            case 'md':
            default:
                return `${base} text-[14px]`;
        }
    });

    readonly logicTextClasses = computed(() => {
        const base =
            'font-black uppercase tracking-tighter text-slate-900 dark:text-slate-100 leading-[0.85]';
        switch (this._size()) {
            case 'sm':
                return `${base} text-[10px]`;
            case 'lg':
                return `${base} text-[20px]`;
            case 'md':
            default:
                return `${base} text-[14px]`;
        }
    });
}
