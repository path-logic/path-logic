import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import posthog, { type PostHogConfig } from 'posthog-js';

/**
 * Singleton service wrapping the PostHog SDK.
 * Provides SSR safety by checking the platform before any PostHog call.
 */
@Injectable({ providedIn: 'root' })
export class PostHogService {
    private readonly platformId = inject(PLATFORM_ID);
    private initialized = false;

    /**
     * The posthog instance. Returns a no-op proxy on the server to ensure SSR safety.
     */
    get posthog(): typeof posthog {
        if (isPlatformBrowser(this.platformId) && this.initialized) {
            return posthog;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new Proxy({} as typeof posthog, { get: () => () => undefined }) as any;
    }

    init(apiKey: string, options: Partial<PostHogConfig>): void {
        if (isPlatformBrowser(this.platformId) && !this.initialized) {
            posthog.init(apiKey, options);
            this.initialized = true;
        }
    }
}
