import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { StorybookConfig } from '@storybook/nextjs-vite';

/**
 * Extracts aliases from a tsconfig file
 */
function getAliasesFromTsConfig(configPath: string) {
    try {
        const absolutePath = resolve(dirname(fileURLToPath(import.meta.url)), '../', configPath);
        const content = readFileSync(absolutePath, 'utf8');

        // Remove comments and parse JSON
        const cleanContent = content
            .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
            .replace(/,\s*([\]}])/g, '$1'); // Handle trailing commas

        const json = JSON.parse(cleanContent);
        const baseUrl = json.compilerOptions?.baseUrl || '.';
        const paths = json.compilerOptions?.paths || {};
        const aliases: Record<string, string> = {};

        for (const [key, value] of Object.entries(paths)) {
            const aliasKey = key.replace('/*', '');
            // Take the first path and resolve it relative to baseUrl
            const targetPath = (value as string[])[0]?.replace('/*', '') || '';
            // Handle absolute paths vs relative paths
            const resolvedPath = resolve(dirname(absolutePath), baseUrl, targetPath);
            aliases[aliasKey] = resolvedPath;
            console.log(`[Storybook] Map alias: ${aliasKey} -> ${resolvedPath}`);
        }
        return aliases;
    } catch (e) {
        console.warn(
            `[Storybook] Could not parse tsconfig at ${configPath}, falling back to default alias.`,
            e,
        );
        return { '@': resolve(dirname(fileURLToPath(import.meta.url)), '../src') };
    }
}

// Find --tsconfig argument
const tsconfigArgIndex = process.argv.indexOf('--tsconfig');
const tsconfigPath =
    tsconfigArgIndex !== -1
        ? process.argv[tsconfigArgIndex + 1]
        : process.env['STORYBOOK_TSCONFIG'] || '.storybook/tsconfig.json';

const dynamicAliases = getAliasesFromTsConfig(tsconfigPath as string);

const config: StorybookConfig = {
    stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    framework: {
        name: getAbsolutePath('@storybook/nextjs-vite'),
        options: {},
    },
    staticDirs: ['../public'],
    addons: [
        getAbsolutePath('@storybook/addon-a11y'),
        getAbsolutePath('@storybook/addon-coverage'),
    ],
    typescript: {
        check: false,
    },
    core: {
        disableTelemetry: true,
    },
    async viteFinal(config) {
        if (config.resolve) {
            config.resolve.alias = {
                ...config.resolve.alias,
                ...dynamicAliases,
            };
        }
        return config;
    },
};

export default config;

function getAbsolutePath(value: string): any {
    return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
