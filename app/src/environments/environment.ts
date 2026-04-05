import type { IEnvironment } from '../app/models/environment.model';

export const environment: IEnvironment = {
    production: false,
    appEnv: 'development',
    firebase: {
        apiKey: 'AIzaSyDZelxoNPzvublNKskndunUrSKW67OXlwE',
        authDomain: 'path-logic.firebaseapp.com',
        projectId: 'path-logic',
        storageBucket: 'path-logic.firebasestorage.app',
        messagingSenderId: '109799402431',
        appId: '1:109799402431:web:da6e14d71d9fa07988cf0a',
        measurementId: 'G-8NN4NVKDNX',
    },
};
