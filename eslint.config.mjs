import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default tseslint.config(
    {
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            '**/apps/web/.next/**',
            '**/apps/web/out/**',
            '**/apps/web/build/**',
            '**/next-env.d.ts',
            '**/package-lock.json',
            '**/docs/api/**',
            '**/*.config.mjs',
            '**/*.config.js',
            '**/*.config.ts',
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.strict,
    ...tseslint.configs.stylistic,
    prettier,
    {
        plugins: {
            'simple-import-sort': simpleImportSort,
        },
        languageOptions: {
            parserOptions: {
                project: true,
            },
        },
        rules: {
            // Import sorting
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
            'sort-imports': [
                'error',
                {
                    ignoreCase: false,
                    ignoreDeclarationSort: true, // Handled by simple-import-sort
                    ignoreMemberSort: false,
                    memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
                    allowSeparatedGroups: false,
                },
            ],
            // Enforcement of strict project standards
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'interface',
                    format: ['PascalCase'],
                    custom: {
                        regex: '^I[A-Z]',
                        match: true,
                    },
                },
            ],
            '@typescript-eslint/array-type': [
                'error',
                {
                    default: 'generic',
                },
            ],
            '@typescript-eslint/explicit-function-return-type': 'error',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                },
            ],
            // Allow number array literals as per architecture exception
            '@typescript-eslint/no-array-constructor': 'off',
            // User requirement: Always add explicit type annotations (even if inferrable)
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
        },
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            '**/apps/web/.next/**',
            '**/package-lock.json',
        ],
    },
);
