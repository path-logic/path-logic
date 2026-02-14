import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
    stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    framework: {
        name: getAbsolutePath('@storybook/nextjs-vite'),
        options: {},
    },
    staticDirs: ['../public'],
    addons: [getAbsolutePath("@storybook/addon-a11y"), getAbsolutePath("@storybook/addon-coverage")],
    typescript: {
        check: false,
    },
};

export default config;

function getAbsolutePath(value: string): any {
    return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
