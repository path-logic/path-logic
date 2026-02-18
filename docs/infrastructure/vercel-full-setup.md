# Vercel Configuration & Deployment Guide

This document provides definitive instructions for setting up the Path Logic infrastructure on Vercel, covering both fresh installations and migrations/updates to existing projects.

## 1. Subdomain Architecture

We use a "Dual-Project Slot" strategy to manage the main application and Storybook independently while sharing authentication.

| Environment    | Purpose             | App URL                            | Storybook URL                            |
| :------------- | :------------------ | :--------------------------------- | :--------------------------------------- |
| **Production** | Stable Release      | `www.pathlogicfinance.com`         | `storybook.pathlogicfinance.com`         |
| **Preview**    | Develop/Test Branch | `www-preview.pathlogicfinance.com` | `storybook-preview.pathlogicfinance.com` |

---

## 2. Setting Up From Scratch

### A. Main Application Project

1. **New Project**: Select the `path-logic` repo.
2. **Framework**: Next.js.
3. **Root Directory**: `apps/web` (This allows Next.js to handle the app-specific build).
4. **Build Command**: `npx nx build web` (or leave default if Vercel detects Nx).
5. **Output Directory**: `.next` (default).

### B. Storybook Support Project

1. **New Project**: Select the same `path-logic` repo.
2. **Project Name**: `path-logic-storybook`.
3. **Framework**: Other.
4. **Root Directory**: **Project Root** (where `nx.json` is).
5. **Build Command**: `npm run build-storybook`.
6. **Output Directory**: `apps/web/dist/storybook`.

---

### A. Shared Variables (Recommended: Vercel Shared Variables)

To enable "Session Persistence" (logging in once and having it work on both subdomains), both projects MUST share the same configuration. You should use Vercel's **"Shared Environment Variables"** feature for these and link them to both the `path-logic` and `path-logic-storybook` projects.

| Variable                   | Slot Sensitivity                             | Purpose                      |
| :------------------------- | :------------------------------------------- | :--------------------------- |
| **`AUTH_SECRET`**          | Project-specific values for Prod/Preview/Dev | Key for session encryption.  |
| **`GOOGLE_CLIENT_ID`**     | Project-specific values for Prod/Preview     | OAuth Identity.              |
| **`GOOGLE_CLIENT_SECRET`** | Project-specific values for Prod/Preview     | OAuth Secret.                |
| **`NEXT_PUBLIC_APP_ENV`**  | `production`, `preview`, or `development`    | Data/Storage path isolation. |

### B. Project-Specific Variables (Local to Storybook)

These should remain in the `path-logic-storybook` project only.

| Variable                 | Purpose                     |
| :----------------------- | :-------------------------- |
| **`STORYBOOK_USERNAME`** | Fallback credentials login. |
| **`STORYBOOK_PASSWORD`** | Fallback credentials login. |

> [!IMPORTANT]
> **Environment Isolation**: Never use your Production `GOOGLE_CLIENT_ID` in a Preview slot. This prevents "Environment Bleed" where test data accidentally syncs to a production database.

---

## 4. Updating Existing Projects

If you are migrating naming conventions or fixing build issues:

### Build Fix (Nx Modules)

Ensure the Storybook project uses:

- **Build Command**: `npm run build-storybook`
- **Root Directory**: Repo Root (NOT `apps/web`)

### Domain Updates

1. Go to **Settings** > **Domains**.
2. Remove any legacy `preview.*` or `preview-storybook.*` domains.
3. Add the new patterns:
    - `www` / `www-preview` (Main App)
    - `storybook` / `storybook-preview` (Storybook App)
4. Ensure they are mapped to the correct Git branches (`main` vs `develop`).

---

## 5. Verification Checklist

1. [ ] Deploy `develop` branch -> Check `www-preview.pathlogicfinance.com`.
2. [ ] Deploy `main` branch -> Check `www.pathlogicfinance.com`.
3. [ ] Verify `www-preview` can open `storybook-preview` without re-authenticating.
