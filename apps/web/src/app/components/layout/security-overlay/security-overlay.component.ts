import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ArrowRight, Lock, LucideAngularModule, ShieldAlert } from 'lucide-angular';

/**
 * Premium security overlay that blurs the screen when the session is idle.
 * Prevents unauthorized viewing of PII (Personally Identifiable Information).
 */
@Component({
    selector: 'app-security-overlay',
    standalone: true,
    imports: [LucideAngularModule],
    templateUrl: './security-overlay.component.html',
    styleUrl: './security-overlay.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityOverlayComponent {
    /**
     * Whether the overlay is visible.
     */
    readonly isVisible = input.required<boolean>();

    /**
     * Emitted when the user clicks 'Resume Session'.
     */
    readonly unlocked = output();

    readonly LockIcon = Lock;
    readonly ShieldAlertIcon = ShieldAlert;
    readonly ArrowRightIcon = ArrowRight;
}
