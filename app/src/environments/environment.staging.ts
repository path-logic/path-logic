import type { IEnvironment } from '../app/models/environment.model';

export const environment: IEnvironment = {
    production: false,
    appEnv: 'staging',
    firebase: {
        apiKey: 'AIzaSyCkADmYT4a_XHw_QLjTpTQGzbmAsqxBKpY',
        authDomain: 'path-logic-staging.firebaseapp.com',
        projectId: 'path-logic-staging',
        storageBucket: 'path-logic-staging.firebasestorage.app',
        messagingSenderId: '48071364929',
        appId: '1:48071364929:web:bf92a9abd93bfb14f8d1c0',
        measurementId: 'G-K51TGEKYWV',
    },
};
