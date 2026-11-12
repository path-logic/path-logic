import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import {
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

import { beforeEach } from 'vitest';

try {
    getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
} catch {
    // Already initialized
}

beforeEach(() => {
    getTestBed().resetTestingModule();
});
