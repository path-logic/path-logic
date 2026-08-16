const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['selector', '[data-theme="dark"]'],
    content: [join(__dirname, 'src/**/*.{html,ts}')],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
                // Data tables and forms — loaded via Google Fonts
                data: ['Inter', 'Outfit', 'sans-serif']
            },
            // Brand design tokens as Tailwind utilities.
            // These reference CSS custom properties set by ThemeService,
            // so they automatically switch between dark and light themes.
            colors: {
                brand: {
                    base: 'var(--pl-bg-base)',
                    surface: 'var(--pl-bg-surface)',
                    elevated: 'var(--pl-bg-elevated)',
                    border: 'var(--pl-border-subtle)'
                },
                content: {
                    primary: 'var(--pl-text-primary)',
                    muted: 'var(--pl-text-muted)',
                    disabled: 'var(--pl-text-disabled)'
                },
                accent: {
                    violet: 'var(--pl-accent-violet)'
                },
                status: {
                    pos: 'var(--pl-status-pos)',
                    neg: 'var(--pl-status-neg)',
                    warn: 'var(--pl-status-warn)'
                }
            },
            boxShadow: {
                premium: '0 8px 30px rgba(0,0,0,0.04)',
                glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
            }
        }
    },
    plugins: [require('tailwindcss-primeui')]
};
