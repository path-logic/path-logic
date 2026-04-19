import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertTriangle, ArrowRight, Database, LucideAngularModule, Shield } from 'lucide-angular';

import { AppShellComponent } from '../../../components/layout/app-shell/app-shell.component';

/**
 * Developer Tools index page.
 * Provides entry points to various system diagnostics and maintenance tools.
 */
@Component({
    selector: 'dev-index',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, RouterLink, AppShellComponent],
    templateUrl: './dev-index.component.html',
    styleUrls: ['./dev-index.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DevIndexComponent {
    // Lucide Icons
    readonly ArrowRight = ArrowRight;
    readonly Database = Database;
    readonly AlertTriangle = AlertTriangle;
    readonly Shield = Shield;
}
