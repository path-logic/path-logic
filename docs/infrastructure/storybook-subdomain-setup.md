# Storybook Subdomain Setup Guide

This guide outlines the steps required to host Storybook as a dedicated subdomain (`storybook.pathlogicfinance.com`) while sharing authentication with the main application.

## 1. Vercel Configuration

### Option A: Multiple Domains in Single Project (Recommended for Simple Repos)

1. Go to your project settings in the Vercel Dashboard.
2. Navigate to **Domains**.
3. Add `storybook.pathlogicfinance.com`.
4. Create a **Middleware (Proxy)** rewrite to route the subdomain to a specific path or build artifact.
    - _Note: Since Storybook is a static build, it is often easier to deploy it as a separate project or use Next.js Rewrites._

### Option B: Separate Vercel Project (Recommended for Scalability)

1. Create a new project in Vercel.
2. Link it to the same repository.
3. Configure the **Build Command** to build Storybook:
    ```bash
    npx nx build-storybook web
    ```
4. Configure the **Output Directory** to:
    ```
    apps/web/dist/storybook
    ```
5. Add the domain `storybook.pathlogicfinance.com` to this project.

## 2. Shared Authentication (NextAuth)

For a user to stay logged in when moving between `pathlogicfinance.com` and `storybook.pathlogicfinance.com`, you must share the session cookie.

### Implementation Steps

1. **Shared Secret**: Ensure `AUTH_SECRET` (or `NEXTAUTH_SECRET`) is identical in BOTH Vercel projects.
2. **Cookie Domain**: Update the NextAuth configuration to use a wildcard domain.
    ```typescript
    // apps/web/src/lib/auth.ts
    export const { handlers, auth } = NextAuth({
        // ... providers
        cookies: {
            sessionToken: {
                name: `__Secure-next-auth.session-token`,
                options: {
                    httpOnly: true,
                    sameSite: 'lax',
                    path: '/',
                    secure: true,
                    domain: '.pathlogicfinance.com', // The leading dot is critical
                },
            },
        },
    });
    ```

## 3. DNS Configuration

1. In your domain registrar (Google Domains, Cloudflare, etc.), add a **CNAME** record:
    - **Name**: `storybook`
    - **Target**: `cname.vercel-dns.com` (or as specified by Vercel).

## 4. Environment Variables

Ensure the following are set for the Storybook environment:

- `STORYBOOK_USERNAME`
- `STORYBOOK_PASSWORD`
- `AUTH_SECRET`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
