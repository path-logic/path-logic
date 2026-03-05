import { provideRouter } from '@angular/router';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import { applicationConfig, type Preview } from '@storybook/angular';

import docJson from '../documentation.json';

setCompodocJson(docJson);

const preview: Preview = {
    decorators: [
        applicationConfig({
            providers: [provideRouter([{ path: 'iframe.html', redirectTo: '' }])],
        }),
    ],
    parameters: {
        actions: { argTypesRegex: '^on[A-Z].*' },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/,
            },
        },
        // We use tailwind, so applying padding to the body helps give components breathing room
        layout: 'padded',
        // Global a11y configuration
        a11y: {
            test: 'error',
            config: {
                rules: [
                    {
                        // Default to forgiving color contrast for un-themed components during porting,
                        // but generally we want strict compliance.
                        id: 'color-contrast',
                        enabled: true,
                    },
                ],
            },
        },
    },
};

export default preview;
