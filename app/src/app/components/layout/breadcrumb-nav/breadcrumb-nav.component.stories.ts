import { APP_INITIALIZER, inject, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { BreadcrumbNavComponent } from './breadcrumb-nav.component';

/**
 * Mock LedgerStore to resolve account IDs to names.
 */
const mockLedgerStore = {
    accounts: signal([
        { id: 'acc-123', name: 'Chase Checking' },
        { id: 'acc-456', name: 'Amex Gold' }
    ])
};

const meta: Meta<BreadcrumbNavComponent> = {
    title: 'Layout/BreadcrumbNavComponent',
    component: BreadcrumbNavComponent,
    tags: ['autodocs'],
    decorators: [
        applicationConfig({
            providers: [provideRouter([]), { provide: LedgerStore, useValue: mockLedgerStore }]
        })
    ]
};

export default meta;
type Story = StoryObj<BreadcrumbNavComponent>;

/**
 * Helper to mock the Router URL for a specific story.
 */
const withMockUrl = (url: string) => {
    return applicationConfig({
        providers: [
            {
                provide: APP_INITIALIZER,
                useFactory: () => {
                    const router = inject(Router);
                    Object.defineProperty(router, 'url', {
                        get: () => url,
                        configurable: true
                    });
                    return () => {};
                },
                multi: true
            }
        ]
    });
};

/**
 * At the root of the application.
 */
export const Root: Story = {
    decorators: [withMockUrl('/')]
};

/**
 * Deep navigation path without dynamic IDs.
 */
export const SettingsStyleGuide: Story = {
    decorators: [withMockUrl('/settings/style-guide')]
};

/**
 * Deep navigation path with a dynamic account ID that needs resolution.
 */
export const AccountDetail: Story = {
    decorators: [withMockUrl('/accounts/acc-123/info')]
};

/**
 * Fallback behavior when an account ID cannot be found.
 */
export const UnknownAccountDetail: Story = {
    decorators: [withMockUrl('/accounts/unknown-999/info')]
};
