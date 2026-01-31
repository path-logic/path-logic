# NX Cloud Setup for CI/CD

## Overview

This project uses NX Cloud for distributed caching and task execution. To enable NX Cloud in CI/CD pipelines, you need to configure an access token.

## Getting the Access Token

1. **Login to NX Cloud:**

    ```bash
    npx nx-cloud login
    ```

2. **Get your access token:**
    - Visit [https://cloud.nx.app](https://cloud.nx.app)
    - Navigate to your workspace settings
    - Copy the "Access Token" from the workspace settings

## Setting up GitHub Actions

### Add Secret to GitHub Repository

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NX_CLOUD_ACCESS_TOKEN`
5. Value: Paste your NX Cloud access token
6. Click **Add secret**

## How It Works

### With Access Token

- ✅ Full NX Cloud features enabled
- ✅ Remote caching across CI runs
- ✅ Distributed task execution
- ✅ Build insights and analytics
- ✅ Faster CI builds (cached results)

### Without Access Token

- ⚠️ NX Cloud features disabled
- ✅ Builds still work (local cache only)
- ⚠️ Slower CI builds (no remote cache)
- ⚠️ No build analytics

## Environment Variables

The following environment variables are used:

- `NX_CLOUD_ACCESS_TOKEN` - Your workspace access token (required for remote cache)
- `NX_CLOUD_NO_TIMEOUTS` - Prevents timeout errors when token is missing

## Local Development

For local development, NX Cloud is optional. If you want to use it:

```bash
# Login once
npx nx-cloud login

# Your credentials are stored locally
# Remote caching will work automatically
```

## Troubleshooting

### "Workspace is unable to be authorized" Error

This error occurs when:

1. The `NX_CLOUD_ACCESS_TOKEN` secret is not set in GitHub
2. The token is invalid or expired

**Solution:**

- Add the token to GitHub secrets (see above)
- Or run locally: `npx nx-cloud login`

### Builds Work Locally But Fail in CI

Check that:

1. The secret is named exactly `NX_CLOUD_ACCESS_TOKEN`
2. The secret is available to the workflow (check repository settings)
3. The workflow has `env:` section with the token reference

## Benefits of NX Cloud

- **Speed:** Remote caching means tasks only run once across all machines
- **Insights:** Detailed analytics on build performance
- **Collaboration:** Share cache across team members
- **Cost Savings:** Reduced CI/CD minutes usage

## Cost

- **Free Tier:** 500 hours/month of remote cache
- **Paid Plans:** Available for larger teams

For more information, visit [https://nx.dev/ci/intro/ci-with-nx](https://nx.dev/ci/intro/ci-with-nx)
