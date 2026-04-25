import type { FirebaseOptions } from '@firebase/app';

import type { IEnvironment } from '../app/models/environment.model';

export const environment: IEnvironment = {
    production: true,
    appEnv: 'production',
    sentryDsn:
        'https://0a015d5726fa347de981f189f161fb9e@o4511216118857728.ingest.us.sentry.io/4511216120168448',
    posthogKey: import.meta.env['NG_APP_POSTHOG_PROJECT_TOKEN'] || '',
    posthogHost: import.meta.env['NG_APP_POSTHOG_HOST'] || 'https://us.i.posthog.com',
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
