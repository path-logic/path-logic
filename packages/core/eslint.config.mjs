import baseConfig from '../../eslint.config.mjs';

export default [
    ...baseConfig,
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
];
