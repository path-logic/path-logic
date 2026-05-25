import type { FirebaseOptions } from '@firebase/app';

import type { IEnvironment } from '../app/models/environment.model';

export const environment: IEnvironment = {
    production: true,
    appEnv: 'production',
    posthogKey: 'phc_BSRGbh2VAQDwaDfMikYttap4zS9RFKBw4AKH9EPYCyo7',
    posthogHost: 'https://us.i.posthog.com',
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
