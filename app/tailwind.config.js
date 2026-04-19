const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
        ...createGlobPatternsForDependencies(__dirname)
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', 'sans-serif']
            },
            boxShadow: {
                premium: '0 8px 30px rgba(0,0,0,0.04)',
                glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
            }
        }
    },
    plugins: [require('tailwindcss-primeui')]
};
