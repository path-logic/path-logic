import type { FirebaseOptions } from '@firebase/app';

import type { IEnvironment } from '../app/models/environment.model';

export const environment: IEnvironment = {
    production: false,
    appEnv: 'development',
    enableRemoteLogging: true,
    remoteLogEndpoint: '/api/log',
    posthogKey:
        (typeof import.meta !== 'undefined' &&
            import.meta.env &&
            import.meta.env['NG_APP_POSTHOG_PROJECT_TOKEN']) ||
        '',
    posthogHost:
        (typeof import.meta !== 'undefined' &&
            import.meta.env &&
            import.meta.env['NG_APP_POSTHOG_HOST']) ||
        'https://us.i.posthog.com',
    firebase: {
        apiKey: 'AIzaSyCstrz1oBCHsXtT8RvaVqIX1nw-uwCu1sU',
        authDomain: 'path-logic-dev-93185.firebaseapp.com',
        projectId: 'path-logic-dev-93185',
        storageBucket: 'path-logic-dev-93185.firebasestorage.app',
        messagingSenderId: '97070614210',
        appId: '1:97070614210:web:9c4d573e4edf2b01789d5b',
        measurementId: 'G-X44QWVEY5G'
    } satisfies FirebaseOptions,
    theme: {
        primary: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6', // Premium Solid Blue
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
            950: '#172554'
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
        faviconLight: '#1d4ed8',
        faviconDark: '#3b82f6',
        bannerBg: '#2563eb',
        bannerText: '#ffffff'
    }
};
