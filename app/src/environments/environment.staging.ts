import type { FirebaseOptions } from '@firebase/app';

import type { IEnvironment } from '../app/models/environment.model';

export const environment: IEnvironment = {
    production: false,
    appEnv: 'staging',
    posthogKey: 'phc_BSRGbh2VAQDwaDfMikYttap4zS9RFKBw4AKH9EPYCyo7',
    posthogHost: 'https://us.i.posthog.com',
    firebase: {
        apiKey: 'AIzaSyCkADmYT4a_XHw_QLjTpTQGzbmAsqxBKpY',
        authDomain: 'path-logic-staging.firebaseapp.com',
        projectId: 'path-logic-staging',
        storageBucket: 'path-logic-staging.firebasestorage.app',
        messagingSenderId: '48071364929',
        appId: '1:48071364929:web:bf92a9abd93bfb14f8d1c0',
        measurementId: 'G-K51TGEKYWV'
    } satisfies FirebaseOptions,
    theme: {
        primary: {
            50: '#fff7ed',
            100: '#ffedd5',
            200: '#fed7aa',
            300: '#fdba74',
            400: '#fb923c',
            500: '#f97316', // Orange 500
            600: '#ea580c',
            700: '#c2410c',
            800: '#9a3412',
            900: '#7c2d12',
            950: '#431407'
        },
        success: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
            950: '#172554'
        },
        faviconLight: '#c2410c',
        faviconDark: '#f97316',
        bannerBg: '#ea580c',
        bannerText: '#ffffff'
    }
};
