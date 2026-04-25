// Type declarations for Angular build environment variables (NG_APP_* prefix).
// These are global augmentations and cannot follow the I-prefix naming convention.
/* eslint-disable @typescript-eslint/naming-convention */
declare interface Env {
    readonly NODE_ENV: string;
    readonly NG_APP_POSTHOG_PROJECT_TOKEN: string;
    readonly NG_APP_POSTHOG_HOST: string;
}

declare interface ImportMeta {
    readonly env: Env;
}
/* eslint-enable @typescript-eslint/naming-convention */
