import type { FirebaseOptions } from '@firebase/app';

import type { IEnvironment } from '../app/models/environment.model';

/**
 * E2E test environment.
 * Auth guard is bypassed so Playwright can access protected routes.
 */
export const environment: IEnvironment = {
    production: false,
    appEnv: 'development',
    e2e: true,
    sentryDsn:
        'https://0a015d5726fa347de981f189f161fb9e@o4511216118857728.ingest.us.sentry.io/4511216120168448',
    firebase: {
        apiKey: 'AIzaSyDZelxoNPzvublNKskndunUrSKW67OXlwE',
        authDomain: 'path-logic.firebaseapp.com',
        projectId: 'path-logic',
        storageBucket: 'path-logic.firebasestorage.app',
        messagingSenderId: '109799402431',
        appId: '1:109799402431:web:da6e14d71d9fa07988cf0a',
        measurementId: 'G-8NN4NVKDNX'
    } satisfies FirebaseOptions
};
