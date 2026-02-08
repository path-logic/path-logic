# Vercel Deployment & Environment Guide

Vercel provides a powerful environment model that maps perfectly to a modern development workflow. Here is how it is structured for Path Logic.

## 1. Environment Model

### 🚀 Production (Standard: `main` branch)

- **Trigger**: Every push or merge to the `main` branch.
- **URL**: `pathlogicfinance.com` (once configured) or `path-logic.vercel.app`.
- **Use Case**: The stable version of the application that users interact with.

### 🧪 Preview / Staging (Standard: Pull Requests)

- **Trigger**: Every time a Pull Request is opened or updated.
- **URL**: Unique per PR (e.g., `path-logic-git-feature-new-ledger-path-logic.vercel.app`).
- **Use Case**: Testing new features (like the Granular Splits or QIF Parser) in a real web environment before they hit production.
- **Isolation**: Each preview deployment is isolated, allowing multiple people to test different features simultaneously.

### 💻 Development (Local)

- **Command**: `npm run dev`.
- **URL**: `localhost:3000`.
- **Use Case**: Rapid iteration and local debugging.

## 2. Setup Guide

To get the GitHub Actions (`deploy.yml`) working, you need to provide three secrets in your GitHub Repository settings (`Settings > Secrets and variables > Actions`):

| Secret Name    | Description            | How to get it                                               |
| :------------- | :--------------------- | :---------------------------------------------------------- |
| `VERCEL_TOKEN` | Personal Access Token  | [Vercel Tokens Page](https://vercel.com/account/tokens)     |
| `ORG_ID`       | Vercel Team/Account ID | Found in `.vercel/project.json` after running `vercel link` |
| `PROJECT_ID`   | Vercel Project ID      | Found in `.vercel/project.json` after running `vercel link` |

### How to link your project manually

If you haven't linked the project yet, run this in your terminal:

```bash
npx vercel link
```

Follow the prompts. This will create a `.vercel` folder with a `project.json` file containing your `orgId` and `projectId`.

## 3. Environment Variables

For the application to function correctly in production (especially Authentication and Google Drive sync), you must configure the following Environment Variables in the Vercel Dashboard (`Settings > Environment Variables`):

| Variable Name                  | Description                                                 | Source                                  |
| :----------------------------- | :---------------------------------------------------------- | :-------------------------------------- |
| `AUTH_SECRET`                  | Secret used to encrypt Auth.js sessions.                    | Generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID`             | Google OAuth Client ID.                                     | Google Cloud Console                    |
| `GOOGLE_CLIENT_SECRET`         | Google OAuth Client Secret.                                 | Google Cloud Console                    |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Public ID for Google Client.                                | Should match `GOOGLE_CLIENT_ID`         |
| `NEXT_PUBLIC_APP_ENV`          | App environment: `production`, `preview`, or `development`. |

> [!IMPORTANT]
> Ensure these are added for **Production**, **Preview**, and **Development** environments in Vercel to ensure consistent behavior across all stages.

## 4. Troubleshooting

### 🛑 Google OAuth `redirect_uri_mismatch`

If you are using a custom domain (e.g., `www.pathlogicfinance.com`), you must register the exact callback URL in your Google Cloud Project:

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2.  Select your project and click the **Client ID** under "OAuth 2.0 Client IDs".
3.  Scroll to **Authorized redirect URIs**.
4.  Add the following URIs:
    - `https://www.pathlogicfinance.com/api/auth/callback/google`
    - `https://pathlogicfinance.com/api/auth/callback/google`
    - `https://path-logic.vercel.app/api/auth/callback/google` (Keep this for the Vercel domain)
5.  Click **Save**.

> [!NOTE]
> It can take a few minutes for Google to propagate these changes.

## 5. Benefits of Early Deployment

- **Fail Fast**: Catch SSR errors or build-time issues that don't show up in local development.
- **Mobile Testing**: Easily test the PWA features on actual mobile devices via the preview URL.
- **Data Persistence**: Verify IndexedDB and GDrive sync in a secure HTTPS environment (required for many Google APIs).
