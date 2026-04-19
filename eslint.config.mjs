import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
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
            '**/documentation.json'
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
    prettier
);
