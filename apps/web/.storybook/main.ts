import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
    stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    framework: {
        name: getAbsolutePath('@storybook/nextjs'),
        options: {},
    },
    staticDirs: ['../public'],
    addons: ['@storybook/addon-interactions', '@storybook/addon-a11y', '@storybook/addon-coverage'],
    typescript: {
        check: false,
    },
};

export default config;

function getAbsolutePath(value: string): any {
    return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
