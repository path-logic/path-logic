'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    ArrowLeft,
    AlertTriangle,
    Trash2,
    Database,
    RotateCcw,
    ShieldAlert,
    CheckCircle2,
    XCircle,
    Users,
    Tag,
    Wallet,
    Info,
    RefreshCw,
} from 'lucide-react';

import { useIsMounted } from '@/hooks/useIsMounted';

import { useLedgerStore } from '@/store/ledgerStore';
import { factoryResetDrive } from '@/lib/storage/GoogleDriveAdapter';
import { clearLocalFallback } from '@/lib/storage/LocalPersistenceAdapter';
import { deletePayee, deleteCategory, softDeleteAccount } from '@/lib/storage/SQLiteAdapter';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

export default function MaintenancePage(): React.ReactElement {
    const { data: session } = useSession();
    const isInitialized = useLedgerStore(state => state.isInitialized);
    const initialize = useLedgerStore(state => state.initialize);
    const reset = useLedgerStore(state => state.reset);
    const store = useLedgerStore(); // Keep for database explorer data

    // UI State
    const [isResetting, setIsResetting] = useState(false);
    const [resetSuccess, setResetSuccess] = useState<boolean | null>(null);
    const [wasPartial, setWasPartial] = useState(false);
    const [showConfirmReset, setShowConfirmReset] = useState(false);
    const [showConfirmForceWipe, setShowConfirmForceWipe] = useState(false);
    const [activeTab, setActiveTab] = useState('accounts');
    const isMounted = useIsMounted();

    // Initialize store if not done
    useEffect(() => {
        if (!isInitialized) {
            initialize();
        }
    }, [isInitialized, initialize]);

    const handleFactoryReset = async (): Promise<void> => {
        setIsResetting(true);
        setResetSuccess(null);
        let cloudWipeFailed = false;

        try {
            // 1. Try to Wipe Drive if authenticated
            if (session?.accessToken) {
                try {
                    await factoryResetDrive(session.accessToken as string);
                } catch (cloudError) {
                    console.warn(
                        '[Maintenance] Cloud wipe failed (handled), proceeding with local wipe:',
                        cloudError,
                    );
                    cloudWipeFailed = true;
                }
            } else {
                console.warn('[Maintenance] No access token found, skipping cloud wipe.');
                cloudWipeFailed = true;
            }

            // 2. Clear Local Cache (IndexedDB)
            await clearLocalFallback();

            // 3. Reset In-Memory Store & SQLite
            reset();

            setResetSuccess(true);
            setWasPartial(cloudWipeFailed);

            setShowConfirmReset(false);
        } catch (error) {
            console.error('Factory reset failed:', error);
            setResetSuccess(false);
        } finally {
            setIsResetting(false);
        }
    };

    const handleForceWipeLocal = async (): Promise<void> => {
        setIsResetting(true);
        try {
            // 1. Clear Local Cache (IndexedDB)
            await clearLocalFallback();

            // 2. Reset In-Memory Store & SQLite
            reset();

            setResetSuccess(true);
            setShowConfirmForceWipe(false);
        } catch (error) {
            console.error('Force wipe failed:', error);
            setResetSuccess(false);
        } finally {
            setIsResetting(false);
        }
    };

    const handleDeletePayee = async (id: string): Promise<void> => {
        try {
            deletePayee(id);
            await initialize(); // Refresh store
        } catch (error) {
            console.error('Failed to delete payee:', error);
        }
    };

    const handleDeleteCategory = async (id: string): Promise<void> => {
        try {
            deleteCategory(id);
            await initialize(); // Refresh store
        } catch (error) {
            console.error('Failed to delete category:', error);
        }
    };

    const handleDeleteAccount = async (id: string): Promise<void> => {
        try {
            softDeleteAccount(id);
            await initialize(); // Refresh store
        } catch (error) {
            console.error('Failed to delete account:', error);
        }
    };

    if (!isMounted) return <></>;

    return (
        <div className="space-y-12 pb-12">
            {/* Header */}
            <header className="flex justify-between items-end border-b border-border/30 pb-8">
                <div className="space-y-1">
                    <Link
                        href="/settings/dev"
                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors mb-4 group"
                    >
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        Back to Dev Tools
                    </Link>
                    <h1 className="text-xl font-black uppercase tracking-[0.2em] text-primary">
                        System <span className="text-foreground">Maintenance</span>
                    </h1>
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-[0.2em] opacity-60">
                        Environment-level data destruction and low-level entity management
                    </p>
                </div>

                <div className="hidden md:block">
                    <div className="px-4 py-2 rounded-full border border-border/20 bg-muted/5 backdrop-blur-sm flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                            SYSTEM_OPERATIONAL_MODE: DEV
                        </span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Factory Reset & Dangers */}
                <div className="lg:col-span-1 space-y-8">
                    <Card className="overflow-hidden relative p-8">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <ShieldAlert className="w-5 h-5 text-red-500" />
                                <h2 className="text-sm font-black uppercase tracking-widest">
                                    Factory Reset
                                </h2>
                            </div>

                            <p className="text-[11px] text-muted-foreground leading-relaxed font-bold opacity-60">
                                This will permanently destroy all data in this environment.
                            </p>

                            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 space-y-3">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-red-500/80 leading-relaxed">
                                        Performs a full wipe of:
                                        <ul className="list-disc list-inside mt-2 space-y-1 opacity-70 italic">
                                            <li>Google Drive Ledger Files</li>
                                            <li>Google Drive Lock Files</li>
                                            <li>Local Browser Cache (IndexedDB)</li>
                                            <li>In-memory SQLite State</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {resetSuccess === true && (
                                <div
                                    className={cn(
                                        'p-3 rounded border flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest',
                                        wasPartial
                                            ? 'bg-amber-500/5 border-amber-500/20 text-amber-500'
                                            : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500',
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        {wasPartial ? (
                                            <AlertTriangle className="w-4 h-4" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                        )}
                                        {wasPartial
                                            ? 'Local wipe complete'
                                            : 'Environment wiped successfully'}
                                    </div>
                                    {wasPartial && (
                                        <p className="text-[9px] opacity-70 italic ml-6">
                                            Cloud skip: Auth error or connection lost.
                                        </p>
                                    )}
                                </div>
                            )}

                            {resetSuccess === false && (
                                <div className="p-3 rounded bg-rose-500/5 border border-rose-500/20 flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase tracking-widest">
                                    <XCircle className="w-4 h-4" />
                                    Reset failed.
                                </div>
                            )}

                            <Dialog open={showConfirmReset} onOpenChange={setShowConfirmReset}>
                                <DialogTrigger asChild>
                                    <button
                                        className="w-full h-12 rounded bg-red-500 text-[10px] font-black uppercase tracking-widest text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                                        type="button"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Initialize Factory Reset
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2 text-red-500">
                                            <ShieldAlert className="w-6 h-6" />
                                            Nuclear Option
                                        </DialogTitle>
                                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground leading-relaxed">
                                            Are you absolutely sure? This action cannot be undone.
                                            All data in the current environment will be lost.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 font-mono text-[10px] text-muted-foreground opacity-60 bg-muted/30 p-4 rounded border border-border/50">
                                        # ENV: {process.env['NEXT_PUBLIC_APP_ENV'] || 'development'}
                                        <br /># USER: {session?.user?.email || 'unauthenticated'}
                                        <br /># STATUS: AWAITING_CONFIRMATION
                                    </div>
                                    <DialogFooter className="gap-2 sm:justify-start">
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowConfirmReset(false)}
                                            className="text-[10px] font-black uppercase tracking-widest h-10 px-6"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={handleFactoryReset}
                                            disabled={isResetting}
                                            className="text-[10px] font-black uppercase tracking-widest h-10 px-6"
                                        >
                                            {isResetting ? (
                                                <>
                                                    <RotateCcw className="w-3 h-3 mr-2 animate-spin" />
                                                    Wiping...
                                                </>
                                            ) : (
                                                'Confirmed Wiping'
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <div className="pt-4 border-t border-border/10">
                                <Dialog
                                    open={showConfirmForceWipe}
                                    onOpenChange={setShowConfirmForceWipe}
                                >
                                    <DialogTrigger asChild>
                                        <button
                                            className="w-full text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-red-500 transition-colors flex items-center justify-center gap-2"
                                            type="button"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            Force Wipe Local Data
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2 text-amber-500">
                                                <AlertTriangle className="w-6 h-6" />
                                                Emergency Local Wipe
                                            </DialogTitle>
                                            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground leading-relaxed">
                                                Use this if your database is corrupted or sync is
                                                stuck. This only clears data on THIS device and does
                                                NOT touch Google Drive.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter className="gap-2 sm:justify-start">
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowConfirmForceWipe(false)}
                                                className="text-[10px] font-black uppercase tracking-widest h-10 px-6"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={handleForceWipeLocal}
                                                disabled={isResetting}
                                                className="text-[10px] font-black uppercase tracking-widest h-10 px-6 bg-amber-600 hover:bg-amber-700 border-none"
                                            >
                                                {isResetting ? 'Wiping...' : 'Force Local Reset'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Info className="w-4 h-4 text-primary opacity-60" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest">
                                Environment Manifest
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-widest">
                            <div className="space-y-1">
                                <p className="text-muted-foreground opacity-40">Persistence</p>
                                <p className="text-foreground/80">Google Drive</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground opacity-40">Local Mode</p>
                                <p className="text-foreground/80">IndexedDB</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground opacity-40">Engine</p>
                                <p className="text-foreground/80">SQLite WASM</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground opacity-40">Security</p>
                                <p className="text-emerald-500 opacity-80">AES-GCM-256</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Database Explorer */}
                <div className="lg:col-span-2">
                    <Card className="flex flex-col h-full min-h-[600px] p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <Database className="w-5 h-5 text-primary" />
                                <h2 className="text-sm font-black uppercase tracking-widest">
                                    Database Explorer
                                </h2>
                            </div>
                            <button
                                onClick={() => store.initialize()}
                                className="h-9 px-4 rounded border border-border/50 bg-muted/5 text-[9px] font-black uppercase tracking-widest hover:bg-muted/10 transition-colors flex items-center gap-2"
                                type="button"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Refresh State
                            </button>
                        </div>

                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="flex-1 flex flex-col"
                        >
                            <TabsList className="bg-muted/10 border border-border/20 p-1 mb-6 grid grid-cols-3 h-11">
                                <TabsTrigger
                                    value="accounts"
                                    className="text-[10px] font-black uppercase tracking-widest h-full"
                                >
                                    <Wallet className="w-3 h-3 mr-2 opacity-60" />
                                    Accounts ({store.accounts.length})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="payees"
                                    className="text-[10px] font-black uppercase tracking-widest h-full"
                                >
                                    <Users className="w-3 h-3 mr-2 opacity-60" />
                                    Payees ({store.payees.length})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="categories"
                                    className="text-[10px] font-black uppercase tracking-widest h-full"
                                >
                                    <Tag className="w-3 h-3 mr-2 opacity-60" />
                                    Categories ({store.categories.length})
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex-1 rounded border border-border/20 bg-muted/5">
                                <TabsContent value="accounts" className="m-0 border-none p-0">
                                    <Table>
                                        <TableHeader className="bg-muted/10 backdrop-blur-sm sticky top-0">
                                            <TableRow className="border-border/10 hover:bg-transparent">
                                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-6 h-10">
                                                    Label
                                                </TableHead>
                                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-6 h-10">
                                                    Type
                                                </TableHead>
                                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-6 h-10">
                                                    Status
                                                </TableHead>
                                                <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-muted-foreground px-6 h-10">
                                                    CMD
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {store.accounts.map(account => (
                                                <TableRow
                                                    key={account.id}
                                                    className="border-border/5 hover:bg-primary/5 transition-colors group"
                                                >
                                                    <TableCell className="px-6 py-3 text-[10px] font-bold text-foreground/80">
                                                        {account.name}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                                                        {account.type}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-3">
                                                        {account.isActive ? (
                                                            <Badge className="bg-emerald-500/5 text-emerald-500 border-emerald-500/20 text-[8px] font-black uppercase tracking-widest h-5">
                                                                ACTIVE
                                                            </Badge>
                                                        ) : (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-muted-foreground/40 border-border/50 text-[8px] font-black uppercase tracking-widest h-5"
                                                            >
                                                                DELETED
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-3 text-right">
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteAccount(account.id)
                                                            }
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 p-1"
                                                            type="button"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {store.accounts.length === 0 && (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={4}
                                                        className="h-32 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30 italic"
                                                    >
                                                        Null Dataset
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TabsContent>

                                <TabsContent value="payees" className="m-0 border-none p-0">
                                    <Table>
                                        <TableHeader className="bg-muted/10 backdrop-blur-sm sticky top-0">
                                            <TableRow className="border-border/10">
                                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-6 h-10">
                                                    Entity Name
                                                </TableHead>
                                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-6 h-10">
                                                    Metadata
                                                </TableHead>
                                                <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-muted-foreground px-6 h-10">
                                                    CMD
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {store.payees.map(payee => (
                                                <TableRow
                                                    key={payee.id}
                                                    className="border-border/5 hover:bg-primary/5 transition-colors group"
                                                >
                                                    <TableCell className="px-6 py-3 text-[10px] font-bold text-foreground/80">
                                                        {payee.name}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-3 text-[9px] font-bold text-muted-foreground opacity-60">
                                                        {payee.notes || '-'}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-3 text-right">
                                                        <button
                                                            onClick={() =>
                                                                handleDeletePayee(payee.id)
                                                            }
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 p-1"
                                                            type="button"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {store.payees.length === 0 && (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={3}
                                                        className="h-32 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30 italic"
                                                    >
                                                        Null Dataset
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TabsContent>

                                <TabsContent value="categories" className="m-0 border-none p-0">
                                    <Table>
                                        <TableHeader className="bg-muted/10 backdrop-blur-sm sticky top-0">
                                            <TableRow className="border-border/10">
                                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-6 h-10">
                                                    Taxonomy
                                                </TableHead>
                                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-6 h-10">
                                                    Descriptor
                                                </TableHead>
                                                <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-muted-foreground px-6 h-10">
                                                    CMD
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {store.categories.map(category => (
                                                <TableRow
                                                    key={category.id}
                                                    className="border-border/5 hover:bg-primary/5 transition-colors group"
                                                >
                                                    <TableCell className="px-6 py-3 text-[10px] font-bold text-foreground/80">
                                                        <div className="flex items-center gap-2">
                                                            {category.parentId && (
                                                                <div className="w-2 h-2 border-l border-b border-border/50 rounded-bl-sm" />
                                                            )}
                                                            {category.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-3 text-[9px] font-bold text-muted-foreground opacity-60">
                                                        {category.description || '-'}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-3 text-right">
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteCategory(category.id)
                                                            }
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 p-1"
                                                            type="button"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {store.categories.length === 0 && (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={3}
                                                        className="h-32 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30 italic"
                                                    >
                                                        Null Dataset
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </Card>
                </div>
            </div>
        </div>
    );
}
