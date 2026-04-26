import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/angular';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Workspace root is two levels up from app/.storybook/
const workspaceRoot = path.resolve(__dirname, '..', '..');

const config = {
    stories: ['../src/app/**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],
    addons: [getAbsolutePath('@storybook/addon-a11y'), getAbsolutePath('@storybook/addon-docs')],
    framework: {
        name: getAbsolutePath('@storybook/angular'),
        options: {}
    },
    // Use Vite builder to avoid Angular CLI/Architect incompatibility with Angular 21.
    core: {
        builder: '@storybook/builder-vite'
    },
    // Resolve TypeScript path aliases from tsconfig.base.json for the Vite pipeline.
    // viteFinal is injected by @storybook/builder-vite and not in the base StorybookConfig type.
    viteFinal: async (config: Record<string, unknown>) => {
        const { mergeConfig } = await import('vite');
        return mergeConfig(config as Parameters<typeof mergeConfig>[0], {
            resolve: {
                alias: {
                    '@core': path.resolve(workspaceRoot, 'app/src/app/core/index.ts')
                }
            }
        });
    }
} satisfies StorybookConfig & Record<string, unknown>;

export default config;

function getAbsolutePath(value: string): string {
    return path.dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
