# Storybook Subdomain Setup Guide

This guide provides a exhaustive step-by-step walkthrough for hosting Storybook on `storybook.pathlogicfinance.com` with shared authentication, across multiple environments (Production vs Preview).

## 1. Dual-Project Mirroring Strategy

To support stable Production and dynamic Preview versions, we treat the Storybook Vercel project as a "shadow" of the main application.

### Environment Mapping

You must ensure that the Environment Variables in the Storybook project exactly match the main application for each environment slot.

| Environment    | App Subdomain                      | Storybook Subdomain                      | Shared Config                       |
| :------------- | :--------------------------------- | :--------------------------------------- | :---------------------------------- |
| **Production** | `www.pathlogicfinance.com`         | `storybook.pathlogicfinance.com`         | Prod `GOOGLE_ID` & `AUTH_SECRET`    |
| **Preview**    | `www-preview.pathlogicfinance.com` | `storybook-preview.pathlogicfinance.com` | Preview `GOOGLE_ID` & `AUTH_SECRET` |

---

## 2. Step-by-Step Vercel Configuration

### Step 1: Create the Storybook Project

1. Log in to the [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** > **Project** and select the `path-logic` repository.
3. Enter `path-logic-storybook` as the project name.
4. Set **Framework Preset** to **Other**.

### Step 2: Configure Build & Output

1. **Root Directory**: Ensure this is set to the **Project Root** (where `nx.json` and the root `package.json` are), NOT `apps/web`.
2. Expand the **Build and Output Settings** section.
3. **Build Command**:
    ```bash
    npm run build-storybook
    ```
    _(Note: This uses the root script which handles Nx resolution correctly)_
4. **Output Directory**:
    ```
    apps/web/dist/storybook
    ```
5. **Install Command**: `npm install` (default).
6. **Nx Integration**: If Vercel offers to "Enable Nx Integration", you can say **Yes**, but manually setting the Build Command to `npm run build-storybook` is safer.

### Step 3: Mirror Environment Variables

For **BOTH** Vercel projects (`path-logic` and `path-logic-storybook`), configure the variables using Vercel's environment slots:

1. **Production Slot**:
    - `AUTH_SECRET`: [Production Secret]
    - `GOOGLE_CLIENT_ID`: [Production Google ID]
    - `NEXT_PUBLIC_VERCEL_ENV`: `production`
2. **Preview Slot**:
    - `AUTH_SECRET`: [Preview Secret]
    - `GOOGLE_CLIENT_ID`: [Preview Google ID]
    - `NEXT_PUBLIC_VERCEL_ENV`: `preview`

> [!IMPORTANT]
> The `AUTH_SECRET` must be identical for both projects within the **same** slot (e.g., both Preview slots use the Preview secret), but different between slots (Production secret ≠ Preview secret). This provides environment isolation.

### Step 4: Configure Subdomains

1. In the **Storybook** project, go to **Settings** > **Domains**.
2. Add `storybook.pathlogicfinance.com` and assign it to the **Production** branch.
3. Add `storybook-preview.pathlogicfinance.com` and assign it to the **Preview** (Develop) branch.

---

## 3. Shared Authentication Logic

The application uses `NEXT_PUBLIC_VERCEL_ENV` to enable cross-subdomain sessions only when deployed to Vercel.

### Implementation Status

The [auth.ts](file:///home/pete/projects/path-logic/apps/web/src/lib/auth.ts) is already configured to support this:

```typescript
// Enabled for both Production and Preview slots on Vercel
...(process.env['NEXT_PUBLIC_VERCEL_ENV'] ? { domain: '.pathlogicfinance.com' } : {}),
```

Because both `storybook.pathlogicfinance.com` and `storybook-preview.pathlogicfinance.com` share the `.pathlogicfinance.com` parent domain, the browser will send the session cookie across the subdomain boundaries.

---

## 4. Troubleshooting: "Could not find Nx modules"

If your Vercel build fails with `[31m Could not find Nx modules at "/vercel/path0".[39m`:

1.  **Use `npm run`**: Ensure your **Build Command** is `npm run build-storybook`. Using `npx nx` directly can cause version mismatches between `npx`'s temporary Nx version and the one in your `node_modules`.
2.  **Verify Root Directory**: Double-check that your Vercel project's **Root Directory** is the repo root. If Vercel is set to `apps/web`, it won't see the monorepo's `node_modules` or `nx.json`.
3.  **Check Sync**: Ensure you have pushed the latest `package.json` (which contains the `build-storybook` script) to your repository before redeploying.

---

## 5. Verification Checklist

- [ ] Log in at `www.pathlogicfinance.com` -> Storybook loads at `storybook.pathlogicfinance.com`.
- [ ] Log in at `www-preview.pathlogicfinance.com` -> Storybook loads at `storybook-preview.pathlogicfinance.com`.
- [ ] **Isolation Test**: Log into Production, visit Preview Storybook. You should be UNKNOWN or asked to log in (due to `AUTH_SECRET` mismatch).
- [ ] `NEXT_PUBLIC_VERCEL_ENV` is correctly set to `production` or `preview` in each Vercel slot.
