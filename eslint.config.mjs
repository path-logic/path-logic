import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.strict,
    ...tseslint.configs.stylistic,
    prettier,
    {
        languageOptions: {
            parserOptions: {
                project: true,
            },
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
        },
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            '**/apps/web/.next/**',
            '**/package-lock.json',
        ],
    }
);
