import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import tseslint from 'typescript-eslint';

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        '.next/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
    ]),
    // Enforce strict typing rules (override Next.js defaults)
    {
        rules: {
            // CRITICAL: Enforce Array<T> syntax instead of T[]
            '@typescript-eslint/array-type': [
                'error',
                {
                    default: 'generic',
                    readonly: 'generic',
                },
            ],
            // CRITICAL: Require explicit return types on functions
            '@typescript-eslint/explicit-function-return-type': 'error',
            // CRITICAL: Require explicit types on module boundaries
            '@typescript-eslint/explicit-module-boundary-types': 'error',
            // CRITICAL: Ban implicit any
            '@typescript-eslint/no-explicit-any': 'error',
            // CRITICAL: Enforce consistent type imports
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                },
            ],
            // Allow explicit types even when inferrable (user requirement)
            '@typescript-eslint/no-inferrable-types': 'off',
            // Enforce interface naming convention
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
        },
    },
]);

export default eslintConfig;
