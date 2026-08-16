import eslint from '@eslint/js';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import playwright from 'eslint-plugin-playwright';
import storybook from 'eslint-plugin-storybook';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            '**/package-lock.json',
            '**/docs/api/**',
            '**/*.config.mjs',
            '**/*.config.js',
            '**/*.config.ts',
            '**/storybook-static/**',
            '**/documentation.json',
            '**/.angular/**',
            '**/scratch/**'
        ]
    },
    eslint.configs.recommended,
    {
        files: ['**/*.ts'],
        extends: [...tseslint.configs.strict, ...tseslint.configs.stylistic],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            }
        },
        rules: {
            // Enforcement of strict project standards
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'interface',
                    format: ['PascalCase'],
                    custom: {
                        regex: '^I[A-Z]',
                        match: true
                    }
                }
            ],
            '@typescript-eslint/array-type': [
                'error',
                {
                    default: 'generic'
                }
            ],
            '@typescript-eslint/explicit-function-return-type': 'error',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports'
                }
            ],
            // Allow number array literals as per architecture exception
            '@typescript-eslint/no-array-constructor': 'off',
            // User requirement: Always add explicit type annotations (even if inferrable)
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_'
                }
            ]
        }
    },
    // Angular specific TS rules
    {
        files: ['app/src/**/*.ts'],
        extends: [...angular.configs.tsRecommended],
        rules: {
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: '',
                    style: 'camelCase'
                }
            ],
            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    prefix: '',
                    style: 'kebab-case'
                }
            ]
        }
    },
    // Angular HTML templates
    {
        files: ['app/src/**/*.html'],
        extends: [...angular.configs.templateRecommended]
    },
    // Playwright test rules
    {
        files: ['e2e/src/**/*.ts'],
        extends: [playwright.configs['flat/recommended']]
    },
    // Storybook
    {
        files: ['app/**/*.stories.ts'],
        extends: [...storybook.configs['flat/recommended']]
    },
    // Storybook, Specs & Mock Overrides (Turn off strict checks for testing code)
    {
        files: ['**/*.stories.ts', '**/*.stories.tsx', '**/*.spec.ts', 'e2e/**/*.ts'],
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-extraneous-class': 'off'
        }
    },
    prettier
);
