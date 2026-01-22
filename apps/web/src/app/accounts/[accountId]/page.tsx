'use client';

import * as React from 'react';
import { use } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AccountLedger } from '@/components/ledger/AccountLedger';

interface IAccountLedgerPageProps {
    params: Promise<{ accountId: string }>;
}

export default function AccountLedgerPage({ params }: IAccountLedgerPageProps): React.JSX.Element {
    const { accountId } = use(params);

    return (
        <AppShell>
            <AccountLedger initialAccountId={accountId} />
        </AppShell>
    );
}
