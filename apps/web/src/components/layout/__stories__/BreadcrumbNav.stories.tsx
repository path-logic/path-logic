import type { Meta, StoryObj } from '@storybook/nextjs';
import React, { useEffect } from 'react';
import { BreadcrumbNav } from '../BreadcrumbNav';
import { useLedgerStore } from '@/store/ledgerStore';
import { AccountType, type IAccount } from '@path-logic/core';

const meta: Meta<typeof BreadcrumbNav> = {
    title: 'Layout/BreadcrumbNav',
    component: BreadcrumbNav,
    parameters: {
        layout: 'padded',
        nextjs: {
            appDirectory: true,
            navigation: {
                pathname: '/accounts/chase-123',
            },
        },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockAccounts = [
    {
        id: 'chase-123',
        name: 'Chase Checking',
        type: AccountType.Checking,
        institutionName: 'Chase',
        clearedBalance: 500000,
        pendingBalance: 500000,
        isActive: true,
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
    },
    {
        id: 'amex-gold',
        name: 'Amex Gold',
        type: AccountType.Credit,
        institutionName: 'American Express',
        clearedBalance: -120000,
        pendingBalance: -120000,
        isActive: true,
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
    },
];

const StoreDecorator = (Story: React.ComponentType): React.JSX.Element => {
    useEffect(() => {
        // Set mock state
        useLedgerStore.setState({ accounts: mockAccounts as Array<IAccount> });
    }, []);

    return <Story />;
};

export const HiddenForTopLevel: Story = {
    parameters: {
        nextjs: {
            navigation: {
                pathname: '/accounts',
            },
        },
    },
};

export const AccountDetail: Story = {
    decorators: [StoreDecorator],
    parameters: {
        nextjs: {
            navigation: {
                pathname: '/accounts/chase-123',
            },
        },
    },
};

export const AccountInfo: Story = {
    decorators: [StoreDecorator],
    parameters: {
        nextjs: {
            navigation: {
                pathname: '/accounts/amex-gold/info',
            },
        },
    },
};

export const HiddenSettings: Story = {
    parameters: {
        nextjs: {
            navigation: {
                pathname: '/settings',
            },
        },
    },
};

export const DeveloperTools: Story = {
    parameters: {
        nextjs: {
            navigation: {
                pathname: '/dev/auth',
            },
        },
    },
};

export const DeeplyNested: Story = {
    parameters: {
        nextjs: {
            navigation: {
                pathname: '/dev/ff/sync-test',
            },
        },
    },
};
