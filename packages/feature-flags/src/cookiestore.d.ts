// TypeScript declarations for CookieStore API
// This is a progressive web API not yet in all TypeScript definitions

interface CookieStoreGetOptions {
    name?: string;
    url?: string;
}

interface CookieInit {
    name: string;
    value: string;
    expires?: number | Date;
    domain?: string;
    path?: string;
    sameSite?: 'strict' | 'lax' | 'none';
}

interface CookieListItem {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
}

interface CookieChangeEvent extends Event {
    changed: Array<CookieListItem>;
    deleted: Array<CookieListItem>;
}

interface CookieStore extends EventTarget {
    get(name?: string): Promise<CookieListItem | null>;
    get(options?: CookieStoreGetOptions): Promise<CookieListItem | null>;
    getAll(name?: string): Promise<Array<CookieListItem>>;
    getAll(options?: CookieStoreGetOptions): Promise<Array<CookieListItem>>;
    set(name: string, value: string): Promise<void>;
    set(options: CookieInit): Promise<void>;
    delete(name: string): Promise<void>;
    delete(options: CookieStoreGetOptions): Promise<void>;
    addEventListener(
        type: 'change',
        listener: (event: CookieChangeEvent) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
        type: 'change',
        listener: (event: CookieChangeEvent) => void,
        options?: boolean | EventListenerOptions
    ): void;
}

interface Window {
    cookieStore: CookieStore;
}

declare const cookieStore: CookieStore;
