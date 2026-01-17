import {
  Money,
  TransactionStatus,
  AccountType,
  type ITransaction
} from '@path-logic/core';

// Mock data leveraging the core types
const MOCK_TRANSACTIONS: ITransaction[] = [
  {
    id: '1',
    accountId: 'acc-1',
    date: '2026-01-17',
    payee: 'Starbucks Coffee',
    totalAmount: -850,
    status: TransactionStatus.Cleared,
    splits: [{ id: 's1', categoryId: 'cat-1', memo: 'Morning coffee', amount: -850 }],
    checkNumber: null,
    importHash: 'xyz123',
    createdAt: '2026-01-17T10:00:00Z',
    updatedAt: '2026-01-17T10:00:00Z',
  },
  {
    id: '2',
    accountId: 'acc-1',
    date: '2026-01-16',
    payee: 'Apple Store',
    totalAmount: -129900,
    status: TransactionStatus.Pending,
    splits: [{ id: 's2', categoryId: 'cat-2', memo: 'MacBook Pro', amount: -129900 }],
    checkNumber: null,
    importHash: 'abc789',
    createdAt: '2026-01-16T15:00:00Z',
    updatedAt: '2026-01-16T15:00:00Z',
  },
  {
    id: '3',
    accountId: 'acc-1',
    date: '2026-01-15',
    payee: 'Employer Inc',
    totalAmount: 450000,
    status: TransactionStatus.Reconciled,
    splits: [
      { id: 's3a', categoryId: 'cat-3', memo: 'Net Pay', amount: 450000 },
      { id: 's3b', categoryId: 'cat-4', memo: 'Tax', amount: -120000 },
    ],
    checkNumber: null,
    importHash: 'def456',
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
];

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-[#0F1115] text-[#E2E8F0] font-sans p-6 overflow-hidden">
      {/* Bloomberg-style Header */}
      <header className="flex items-center justify-between border-b border-[#1E293B] pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#38BDF8]">PATH LOGIC <span className="text-[#64748B] font-normal">// LEDGER</span></h1>
          <p className="text-xs text-[#64748B] uppercase tracking-widest mt-1">Real-time Terminal v1.0.0</p>
        </div>
        <div className="flex gap-8 items-center">
          <div className="text-right">
            <p className="text-[10px] text-[#64748B] uppercase mb-1">Total Cleared</p>
            <p className="text-lg font-mono text-[#10B981]">{Money.formatCurrency(845012)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#64748B] uppercase mb-1">Pending</p>
            <p className="text-lg font-mono text-[#F59E0B]">{Money.formatCurrency(-129900)}</p>
          </div>
        </div>
      </header>

      {/* Grid Layout */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">

        {/* Sidebar / Accounts */}
        <div className="col-span-2 border-r border-[#1E293B] pr-4">
          <h2 className="text-[10px] text-[#64748B] uppercase mb-4 tracking-wider">Accounts</h2>
          <div className="space-y-2">
            <div className="bg-[#1E293B] border-l-2 border-[#38BDF8] p-3 rounded-sm cursor-pointer hover:bg-[#2D3748] transition-colors">
              <p className="text-xs font-semibold">Primary Checking</p>
              <p className="text-[10px] text-[#64748B]">Chase ...5432</p>
            </div>
            <div className="p-3 rounded-sm cursor-pointer hover:bg-[#1E293B] transition-colors">
              <p className="text-xs font-semibold">Rainy Day</p>
              <p className="text-[10px] text-[#64748B]">Vanguard ...8812</p>
            </div>
          </div>
        </div>

        {/* Main Ledger Table */}
        <div className="col-span-10 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <button className="bg-[#38BDF8] text-[#0F1115] text-[10px] font-bold px-3 py-1 rounded-sm uppercase">Import QIF</button>
              <button className="bg-[#1E293B] text-[#E2E8F0] text-[10px] font-bold px-3 py-1 rounded-sm uppercase">Reconcile</button>
            </div>
            <input
              type="text"
              placeholder="FILTER LEDGER..."
              className="bg-[#0F1115] border border-[#1E293B] text-[10px] px-3 py-1 rounded-sm focus:outline-none focus:border-[#38BDF8] w-64 uppercase tracking-wider"
            />
          </div>

          <div className="flex-1 border border-[#1E293B] rounded-sm overflow-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead className="sticky top-0 bg-[#1E293B] text-[#64748B] uppercase text-[10px]">
                <tr>
                  <th className="p-3 border-b border-[#0F1115] w-24">Date</th>
                  <th className="p-3 border-b border-[#0F1115]">Payee / Memo</th>
                  <th className="p-3 border-b border-[#0F1115] w-32">Category</th>
                  <th className="p-3 border-b border-[#0F1115] w-24">Status</th>
                  <th className="p-3 border-b border-[#0F1115] w-32 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {MOCK_TRANSACTIONS.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#1E293B] transition-colors group cursor-pointer">
                    <td className="p-3 font-medium text-[#64748B]">{tx.date}</td>
                    <td className="p-3">
                      <div className="font-semibold text-[#38BDF8] group-hover:text-white">{tx.payee}</div>
                      <div className="text-[10px] text-[#64748B]">{tx.splits[0]?.memo}</div>
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] bg-[#1E293B] px-2 py-0.5 rounded-full border border-[#334155] text-[#94A3B8]">
                        UNFILTERED
                      </span>
                    </td>
                    <td className="p-3 uppercase text-[9px] font-bold">
                      <span className={
                        tx.status === TransactionStatus.Cleared ? 'text-[#10B981]' :
                          tx.status === TransactionStatus.Pending ? 'text-[#F59E0B]' : 'text-[#38BDF8]'
                      }>
                        {tx.status}
                      </span>
                    </td>
                    <td className={`p-3 text-right font-bold ${tx.totalAmount < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                      {Money.formatCurrency(tx.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer / Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#1E293B] border-t border-[#334155] px-4 py-1 flex justify-between items-center text-[9px] text-[#94A3B8] uppercase tracking-widest leading-none">
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse"></span> Terminal Active</span>
          <span>SQLite Local: Connected</span>
        </div>
        <div className="flex gap-4 items-center">
          <span>{new Date().toLocaleDateString()}</span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </footer>
    </main>
  );
}
