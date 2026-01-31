// TypeScript declarations for CookieStore API
// This is a progressive web API not yet in all TypeScript definitions

interface ICookieStoreGetOptions {
    name?: string;
    url?: string;
}

interface ICookieInit {
    name: string;
    value: string;
    expires?: number | Date;
    domain?: string;
    path?: string;
    sameSite?: 'strict' | 'lax' | 'none';
}

interface ICookieListItem {
    name?: string;
    value?: string;
    domain?: string;
    path?: string;
    expires?: number;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
}

interface ICookieChangeEvent extends Event {
    readonly changed: ReadonlyArray<ICookieListItem>;
    readonly deleted: ReadonlyArray<ICookieListItem>;
}

interface ICookieStore extends EventTarget {
    get(nameOrOptions?: string | ICookieStoreGetOptions): Promise<ICookieListItem | null>;
    getAll(nameOrOptions?: string | ICookieStoreGetOptions): Promise<Array<ICookieListItem>>;
    set(nameOrOptions: string | ICookieInit, value?: string): Promise<void>;
    delete(nameOrOptions: string | ICookieStoreGetOptions): Promise<void>;
    addEventListener(
        type: 'change',
        listener: (event: ICookieChangeEvent) => void,
        options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener(
        type: 'change',
        listener: (event: ICookieChangeEvent) => void,
        options?: boolean | EventListenerOptions,
    ): void;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
interface Window {
    cookieStore: ICookieStore;
}

declare const cookieStore: ICookieStore;
