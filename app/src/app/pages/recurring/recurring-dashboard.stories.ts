import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import Lara from '@primeuix/themes/lara';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { providePrimeNG } from 'primeng/config';

import { RecurringDashboardComponent } from './recurring-dashboard.component';

const meta: Meta<RecurringDashboardComponent> = {
    title: 'Pages/Recurring Dashboard',
    component: RecurringDashboardComponent,
    decorators: [
        applicationConfig({
            providers: [
                provideAnimationsAsync(),
                providePrimeNG({
                    theme: {
                        preset: Lara,
                        options: {
                            darkModeSelector: '.dark'
                        }
                    }
                })
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<RecurringDashboardComponent>;

export const Default: Story = {
    args: {}
};
