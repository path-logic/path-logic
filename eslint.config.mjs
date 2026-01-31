import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

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
    jsxA11y.flatConfigs.recommended,
    prettier,
    {
        plugins: {
            'simple-import-sort': simpleImportSort,
            react: react,
            'react-hooks': reactHooks,
        },
        languageOptions: {
            parserOptions: {
                project: true,
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        settings: {
            react: {
                version: 'detect',
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

            // React Rules
            'react/jsx-uses-react': 'off', // Not needed in React 19
            'react/react-in-jsx-scope': 'off', // Not needed in React 19
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // Accessibility Rules (WCAG 2.2 AA Enforcement)
            'jsx-a11y/alt-text': 'error',
            'jsx-a11y/anchor-has-content': 'error',
            'jsx-a11y/anchor-is-valid': 'error',
            'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
            'jsx-a11y/aria-props': 'error',
            'jsx-a11y/aria-proptypes': 'error',
            'jsx-a11y/aria-role': 'error',
            'jsx-a11y/aria-unsupported-elements': 'error',
            'jsx-a11y/autocomplete-valid': 'error',
            'jsx-a11y/click-events-have-key-events': 'error',
            'jsx-a11y/heading-has-content': 'error',
            'jsx-a11y/html-has-lang': 'error',
            'jsx-a11y/iframe-has-title': 'error',
            'jsx-a11y/img-redundant-alt': 'error',
            'jsx-a11y/interactive-supports-focus': 'error',
            'jsx-a11y/label-has-associated-control': 'error',
            'jsx-a11y/media-has-caption': 'warn', // Warn instead of error for flexibility
            'jsx-a11y/mouse-events-have-key-events': 'error',
            'jsx-a11y/no-access-key': 'error',
            'jsx-a11y/no-autofocus': 'warn', // Warn - sometimes needed for UX
            'jsx-a11y/no-distracting-elements': 'error',
            'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
            'jsx-a11y/no-noninteractive-element-interactions': 'error',
            'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
            'jsx-a11y/no-noninteractive-tabindex': 'error',
            'jsx-a11y/no-redundant-roles': 'error',
            'jsx-a11y/no-static-element-interactions': 'error',
            'jsx-a11y/role-has-required-aria-props': 'error',
            'jsx-a11y/role-supports-aria-props': 'error',
            'jsx-a11y/scope': 'error',
            'jsx-a11y/tabindex-no-positive': 'error',

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
