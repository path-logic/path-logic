import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    imports: [RouterOutlet],
    selector: 'app-root',
    template: `<router-outlet />`,
    styles: `
        :host {
            display: block;
            min-height: 100vh;
        }
    `,
})
export class AppComponent {
    // CI/CD Trigger: Standardized branch triggers and staging deployment.
    readonly title = 'Path Logic';
}
