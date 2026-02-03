import type { Preview } from '@storybook/react';
import '../src/app/globals.css';

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        backgrounds: {
            options: {
                dark: { name: 'dark', value: '#0a0a0a' },
                light: { name: 'light', value: '#ffffff' },
            },
        },
    },

    initialGlobals: {
        backgrounds: {
            value: 'dark',
        },
    },
};

export default preview;
