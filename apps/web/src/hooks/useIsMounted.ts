'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to track component mount status.
 * Useful for preventing hydration mismatches by ensuring state-dependent
 * rendering only occurs on the client.
 *
 * Uses requestAnimationFrame to satisfy strict linting rules regarding
 * synchronous state updates in effects.
 */
export function useIsMounted(): boolean {
    const [isMounted, setIsMounted] = useState(false);

    useEffect((): (() => void) => {
        const frameId: number = requestAnimationFrame((): void => setIsMounted(true));
        return (): void => cancelAnimationFrame(frameId);
    }, []);

    return isMounted;
}
