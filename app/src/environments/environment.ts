import type { FirebaseOptions } from '@firebase/app';

import type { IEnvironment } from '../app/models/environment.model';

export const environment: IEnvironment = {
    production: false,
    appEnv: 'development',
    posthogKey: import.meta.env['NG_APP_POSTHOG_PROJECT_TOKEN'] || '',
    posthogHost: import.meta.env['NG_APP_POSTHOG_HOST'] || 'https://us.i.posthog.com',
    firebase: {
        apiKey: 'AIzaSyCstrz1oBCHsXtT8RvaVqIX1nw-uwCu1sU',
        authDomain: 'path-logic-dev-93185.firebaseapp.com',
        projectId: 'path-logic-dev-93185',
        storageBucket: 'path-logic-dev-93185.firebasestorage.app',
        messagingSenderId: '97070614210',
        appId: '1:97070614210:web:9c4d573e4edf2b01789d5b',
        measurementId: 'G-X44QWVEY5G'
    } satisfies FirebaseOptions
};
