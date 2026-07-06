import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/angular';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import type { Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Workspace root is two levels up from app/.storybook/
const workspaceRoot = path.resolve(__dirname, '..', '..');

// Simple custom Vite plugin to inline Angular templateUrl/styleUrls/styleUrl at compile time
function angularTemplateInliner(): Plugin {
    return {
        name: 'angular-template-inliner',
        transform(code: string, id: string): { code: string; map: null } | null {
            if (!id.endsWith('.ts')) {
                return null;
            }

            let newCode = code;
            const fileDir = path.dirname(id);
            let replaced = false;

            // Inline templateUrl
            const templateUrlRegex = /templateUrl\s*:\s*['"`]([^'"`]+)['"`]/g;
            newCode = newCode.replace(templateUrlRegex, (match, url) => {
                const templatePath = path.resolve(fileDir, url);
                if (fs.existsSync(templatePath)) {
                    console.log(`[Inliner] Inlined template in ${path.basename(id)}: ${url}`);
                    replaced = true;
                    const content = fs
                        .readFileSync(templatePath, 'utf8')
                        .replace(/\\/g, '\\\\')
                        .replace(/`/g, '\\`')
                        .replace(/\${/g, '\\${');
                    return `template: \`${content}\``;
                }
                return match;
            });

            // Inline styleUrls (plural array)
            const styleUrlsRegex = /styleUrls\s*:\s*\[\s*['"`]([^'"`]+)['"`]\s*\]/g;
            newCode = newCode.replace(styleUrlsRegex, (match, url) => {
                const stylePath = path.resolve(fileDir, url);
                if (fs.existsSync(stylePath)) {
                    console.log(`[Inliner] Inlined styles (array) in ${path.basename(id)}: ${url}`);
                    replaced = true;
                    const content = fs
                        .readFileSync(stylePath, 'utf8')
                        .replace(/\\/g, '\\\\')
                        .replace(/`/g, '\\`')
                        .replace(/\${/g, '\\${');
                    return `styles: [\`${content}\`]`;
                }
                return match;
            });

            // Inline styleUrl (singular string)
            const styleUrlRegex = /styleUrl\s*:\s*['"`]([^'"`]+)['"`]/g;
            newCode = newCode.replace(styleUrlRegex, (match, url) => {
                const stylePath = path.resolve(fileDir, url);
                if (fs.existsSync(stylePath)) {
                    console.log(`[Inliner] Inlined style (string) in ${path.basename(id)}: ${url}`);
                    replaced = true;
                    const content = fs
                        .readFileSync(stylePath, 'utf8')
                        .replace(/\\/g, '\\\\')
                        .replace(/`/g, '\\`')
                        .replace(/\${/g, '\\${');
                    return `styles: [\`${content}\`]`;
                }
                return match;
            });

            if (replaced) {
                return {
                    code: newCode,
                    map: null
                };
            }
            return null;
        }
    };
}

const config = {
    stories: ['../src/app/**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],
    addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
    framework: {
        name: '@storybook/angular',
        options: {}
    },
    // Use Vite builder to avoid Angular CLI/Architect incompatibility with Angular 21.
    core: {
        builder: '@storybook/builder-vite'
    },
    // Resolve TypeScript path aliases from tsconfig.base.json for the Vite pipeline.
    // viteFinal is injected by @storybook/builder-vite and not in the base StorybookConfig type.
    viteFinal: async (config: Record<string, unknown>): Promise<Record<string, unknown>> => {
        const { mergeConfig } = await import('vite');
        return mergeConfig(config as Parameters<typeof mergeConfig>[0], {
            resolve: {
                alias: {
                    '@core': path.resolve(workspaceRoot, 'app/src/app/core/index.ts')
                }
            },
            css: {
                postcss: {
                    plugins: [
                        tailwindcss(path.resolve(workspaceRoot, 'app/tailwind.config.js')),
                        autoprefixer()
                    ]
                }
            },
            build: {
                minify: false
            },
            define: {
                STORYBOOK_ANGULAR_OPTIONS: JSON.stringify({
                    enableIvy: true
                })
            },
            plugins: [angularTemplateInliner()]
        });
    }
} satisfies StorybookConfig & Record<string, unknown>;

export default config;
