import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Check, LucideAngularModule } from 'lucide-angular';

import { AppShellComponent } from '../../../components/layout/app-shell/app-shell.component';

/**
 * Visual Constitution page.
 * Displays the application's design system, typography, and UI patterns.
 */
@Component({
    selector: 'style-guide',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, AppShellComponent],
    templateUrl: './style-guide.component.html',
    styleUrls: ['./style-guide.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StyleGuideComponent {
    // Lucide Icons
    readonly Check = Check;

    readonly colors = [
        { label: 'Primary', color: 'bg-primary' },
        { label: 'Success', color: 'bg-teal-500' },
        { label: 'Warning', color: 'bg-amber-500' },
        { label: 'Destructive', color: 'bg-red-500' }
    ];
}
