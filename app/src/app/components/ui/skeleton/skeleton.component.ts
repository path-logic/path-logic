import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SkeletonShape } from './skeleton.types';

@Component({
    selector: 'app-skeleton',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div [class]="computedClasses()" [ngStyle]="computedStyles()" aria-hidden="true"></div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        role: 'status',
        'aria-busy': 'true',
        '[attr.aria-label]': 'ariaLabel()',
        class: 'inline-block overflow-hidden leading-none align-middle'
    }
})
export class SkeletonComponent {
    /** Shape of the skeleton placeholder */
    public readonly shape = input<SkeletonShape | `${SkeletonShape}`>(SkeletonShape.Rectangle);

    /** Width CSS value (e.g. '100%', '80px', '2rem', or default auto/full) */
    public readonly width = input<string | null>(null);

    /** Height CSS value (e.g. '1rem', '40px', '100%') */
    public readonly height = input<string | null>(null);

    /** Additional Tailwind styling classes */
    public readonly styleClass = input<string>('');

    /** Accessible label for screen readers */
    public readonly ariaLabel = input<string>('Loading content...');

    /** Computed class string based on shape and custom class */
    public readonly computedClasses = computed(() => {
        const base =
            'animate-pulse bg-surface-200/80 dark:bg-surface-800/80 transition-colors duration-200';
        const shapeClass = this.getShapeClasses(this.shape());
        const custom = this.styleClass();

        return [base, shapeClass, custom].filter(Boolean).join(' ');
    });

    /** Computed inline style for width and height */
    public readonly computedStyles = computed(() => {
        const styles: Record<string, string> = {};
        const w = this.width();
        const h = this.height();

        if (w) {
            styles['width'] = w;
        }
        if (h) {
            styles['height'] = h;
        }

        return styles;
    });

    private getShapeClasses(shape: SkeletonShape | `${SkeletonShape}`): string {
        switch (shape) {
            case SkeletonShape.Circle:
                return 'rounded-full aspect-square';
            case SkeletonShape.Pill:
                return 'rounded-full';
            case SkeletonShape.Card:
                return 'rounded-xl border border-surface-200/60 dark:border-surface-800/60';
            case SkeletonShape.Text:
                return 'rounded h-4 my-1 w-full';
            case SkeletonShape.Rectangle:
            default:
                return 'rounded-lg';
        }
    }
}
