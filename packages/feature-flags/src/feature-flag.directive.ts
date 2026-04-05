import { Directive, effect, inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';

import { FeatureFlagService } from './feature-flags.service';

@Directive({
    selector: '[appFeatureFlag]',
    standalone: true,
})
export class FeatureFlagDirective {
    private templateRef = inject(TemplateRef<unknown>);
    private viewContainer = inject(ViewContainerRef);
    private featureFlagService = inject(FeatureFlagService);

    private hasView = false;
    private flagKey = '';

    @Input() set appFeatureFlag(flag: string) {
        this.flagKey = flag;
    }

    constructor() {
        // Effect to reactively update the view if the flag changes
        effect(() => {
            const isEnabled = this.featureFlagService.isFlagEnabledSignal(this.flagKey)();
            if (isEnabled && !this.hasView) {
                this.viewContainer.createEmbeddedView(this.templateRef);
                this.hasView = true;
            } else if (!isEnabled && this.hasView) {
                this.viewContainer.clear();
                this.hasView = false;
            }
        });
    }
}
