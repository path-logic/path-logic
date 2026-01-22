'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useLedgerStore } from '@/store/ledgerStore';

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes to logout
const WARNING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes to show overlay

/**
 * Manages application security, idle timeouts, and data integrity guards.
 */
export function useSecurityManager(): {
    isIdle: boolean;
    isDirty: boolean;
    authError: boolean;
    unlock: () => void;
} {
    const { data: session } = useSession();
    const isDirty = useLedgerStore((state) => state.isDirty);
    const authError = useLedgerStore((state) => state.authError);

    const [isIdle, setIsIdle] = useState(false);
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimers = useCallback((): void => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

        if (isIdle) {
            setIsIdle(false);
        }

        // Set timer to show overlay (Warning)
        idleTimerRef.current = setTimeout((): void => {
            if (session) {
                console.log('[SecurityManager] Session idle: showing overlay');
                setIsIdle(true);
            }
        }, WARNING_TIMEOUT_MS);

        // Set timer to logout (Critical)
        logoutTimerRef.current = setTimeout((): void => {
            if (session) {
                console.log('[SecurityManager] Session timeout: logging out');
                signOut({ callbackUrl: '/' });
            }
        }, IDLE_TIMEOUT_MS);
    }, [session, isIdle]);

    // 1. Idle Detection
    useEffect((): (() => void) => {
        const events: Array<string> = ['mousedown', 'keydown', 'scroll', 'touchstart'];

        const handleActivity = (): void => {
            if (!isIdle) {
                resetTimers();
            }
        };

        if (session) {
            // Defer the initial reset to avoid synchronous state updates in effect
            const frameId = requestAnimationFrame((): void => {
                resetTimers();
            });

            events.forEach((event: string) => window.addEventListener(event, handleActivity));

            return (): void => {
                cancelAnimationFrame(frameId);
                if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
                if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
                events.forEach((event: string) => window.removeEventListener(event, handleActivity));
            };
        }
        return (): void => { };
    }, [session, isIdle, resetTimers]);

    // 2. Refresh Guard (beforeunload)
    useEffect((): (() => void) => {
        const handleBeforeUnload = (e: BeforeUnloadEvent): string | undefined => {
            if (isDirty || authError) {
                const message = 'You have unsynced changes. Are you sure you want to leave?';
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
            return undefined;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return (): void => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty, authError]);

    return {
        isIdle,
        isDirty,
        authError,
        unlock: resetTimers
    };
}
