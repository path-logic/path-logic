# Firebase & Squarespace Setup Guide

> **Purpose:** Button-by-button instructions for setting up Firebase and reconfiguring Squarespace DNS for Path Logic.

---

## Part 1: Firebase Project Setup

### 1.1 Create the Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** (or "Create a project")
3. **Project name:** `path-logic` (Project ID will auto-generate as `path-logic-xxxxx`)
4. Click **Continue**
5. **Google Analytics:** Toggle **ON** (recommended for prod monitoring)
6. Select or create a Google Analytics account → Click **Create project**
7. Wait for provisioning → Click **Continue**

### 1.2 Register a Web App

1. From the project overview, click the **Web icon** (`</>`) to add a web app
2. **App nickname:** `Path Logic Web`
3. **Firebase Hosting:** Check the box **"Also set up Firebase Hosting for this app"**
4. Click **Register app**
5. Copy the Firebase config object — you'll need it for `environment.ts`:
   This is the actual config data from firebase console for the path-logic projects
    ```typescript
    // Production
    export const firebaseConfig = {
        apiKey: 'AIzaSyDZelxoNPzvublNKskndunUrSKW67OXlwE',
        authDomain: 'path-logic.firebaseapp.com',
        projectId: 'path-logic',
        storageBucket: 'path-logic.firebasestorage.app',
        messagingSenderId: '109799402431',
        appId: '1:109799402431:web:da6e14d71d9fa07988cf0a',
        measurementId: 'G-8NN4NVKDNX'
    };
    // Staging
    const firebaseConfig = {
        apiKey: 'AIzaSyCkADmYT4a_XHw_QLjTpTQGzbmAsqxBKpY',
        authDomain: 'path-logic-staging.firebaseapp.com',
        projectId: 'path-logic-staging',
        storageBucket: 'path-logic-staging.firebasestorage.app',
        messagingSenderId: '48071364929',
        appId: '1:48071364929:web:bf92a9abd93bfb14f8d1c0',
        measurementId: 'G-K51TGEKYWV'
    };
    ```
6. Click **Continue to console**

### 1.3 Enable Google Authentication

1. In the left sidebar, click **Build** → **Authentication**
2. Click **Get started**
3. Go to the **Sign-in method** tab
4. Click **Google** in the provider list
5. Toggle **Enable** to ON
6. **Project support email:** Select your email
7. Click **Save**

### 1.4 Configure OAuth Consent Screen for Drive Scopes

> [!IMPORTANT]
> Firebase Auth handles basic Google sign-in, but for Google Drive `appDataFolder` access, you still need the Drive scope configured in Google Cloud Console.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select the same project (Firebase creates a GCP project automatically)
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. If not already configured:
    - **User Type:** External → Click **Create**
    - Fill in app name: `Path Logic`, support email, developer email
    - Click **Save and Continue**
5. Go to **Scopes** → Click **Add or Remove Scopes**
6. Add these scopes:
    - `https://www.googleapis.com/auth/drive.appdata`
    - `https://www.googleapis.com/auth/userinfo.email`
    - `https://www.googleapis.com/auth/userinfo.profile`
7. Click **Update** → **Save and Continue**
8. Go to **APIs & Services** → **Library** → Search for **"Google Drive API"** → Click **Enable**

### 1.5 Set Up Firebase Hosting (Multi-Site)

#### Main Web App Site

1. In Firebase Console → **Build** → **Hosting**
2. Click **Get started** (if first time) or go to the dashboard
3. The default site is `path-logic-xxxxx.web.app` — this is fine for now
4. Custom domain is added in section 2 below

#### Storybook Site (Second Site)

1. In the Hosting dashboard, click **"Add another site"**
2. **Site ID:** `pathlogic-storybook`
3. This creates `pathlogic-storybook.web.app`
4. Custom domain (`storybook.pathlogicfinance.com`) added in section 2

### 1.6 Install Firebase CLI Locally

```bash
npm install -g firebase-tools
firebase login
firebase init
```

During `firebase init`, select:

- **Hosting: Configure files for Firebase Hosting** → Yes
- **Use an existing project** → Select `path-logic-xxxxx`
- **Public directory:** `dist/apps/web/browser` (Angular build output)
- **Single-page app (rewrite all URLs to /index.html):** Yes
- **Automatic builds and deploys with GitHub:** No (we'll configure CI separately)

### 1.7 Configure `firebase.json`

```json
{
    "hosting": [
        {
            "target": "web",
            "public": "dist/apps/web/browser",
            "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
            "rewrites": [
                {
                    "source": "**",
                    "destination": "/index.html"
                }
            ]
        },
        {
            "target": "storybook",
            "public": "dist/apps/web/storybook",
            "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
        }
    ]
}
```

### 1.8 Create Staging Firebase Project

> [!IMPORTANT]
> A **separate** Firebase project is used for staging to ensure complete data isolation (separate Auth, separate Hosting, separate Google Drive `appDataFolder` namespace).

1. Go to [Firebase Console](https://console.firebase.google.com/) → Click **"Add project"**
2. **Project name:** `path-logic-staging`
3. Follow the same steps as 1.1–1.4 for this project
4. Register a web app with nickname `Path Logic Staging`
5. Enable Google Authentication with the same settings
6. Configure OAuth consent screen and Drive scopes (same as production)
7. Set up Hosting (single site only — no Storybook in staging)

### 1.9 Configure `.firebaserc` (Multi-Project)

```json
{
    "projects": {
        "default": "path-logic-prod",
        "staging": "path-logic-staging"
    },
    "targets": {
        "path-logic-prod": {
            "hosting": {
                "web": ["path-logic-prod"],
                "storybook": ["pathlogic-storybook"]
            }
        },
        "path-logic-staging": {
            "hosting": {
                "web": ["path-logic-staging"]
            }
        }
    }
}
```

**Usage:**

```bash
# Deploy to production
firebase deploy --only hosting -P default

# Deploy to staging
firebase deploy --only hosting -P staging
```

---

## Part 2: Custom Domain Setup (Firebase Console + Squarespace DNS)

### 2.1 Add Custom Domain for Web App

1. In Firebase Console → **Hosting** → select the main site
2. Click **"Add custom domain"**
3. Enter: `pathlogicfinance.com`
4. Firebase will show a **TXT record** for verification:
    - **Host:** `@`
    - **Type:** `TXT`
    - **Value:** (copy the value Firebase provides, e.g., `firebase=path-logic-xxxxx`)

### 2.2 Add TXT Record in Squarespace

1. Log in to [Squarespace](https://www.squarespace.com/)
2. Click your site name → **Settings** (gear icon in left sidebar)
3. Click **Domains**
4. Click `pathlogicfinance.com`
5. Click **DNS Settings** (or **Advanced Settings**)
6. Under **Custom Records**, click **Add Record**:
    - **Record Type:** `TXT`
    - **Host:** `@`
    - **Data:** Paste the Firebase TXT value
    - **TTL:** Default (3600)
7. Click **Save**
8. Go back to Firebase Console → Click **Verify**
9. Wait up to 24 hours (usually minutes) for DNS propagation

### 2.3 Point A Records to Firebase

After verification succeeds, Firebase will show **two IP addresses** for A records.

1. Go back to Squarespace → **Settings** → **Domains** → `pathlogicfinance.com` → **DNS Settings**
2. **Delete** any existing A records pointing to Vercel (you'll see Vercel's IPs: `76.76.21.21` or similar)
3. **Add** two new A records:

| Record Type | Host | Data (Value)       | TTL  |
| ----------- | ---- | ------------------ | ---- |
| A           | `@`  | `(Firebase IP #1)` | 3600 |
| A           | `@`  | `(Firebase IP #2)` | 3600 |

4. Click **Save**

### 2.4 Add www Subdomain

1. Back in Firebase Console → **Hosting** → Click **"Add custom domain"** again
2. Enter: `www.pathlogicfinance.com`
3. Firebase will provide a CNAME or additional A records
4. In Squarespace DNS, add:

| Record Type | Host  | Data                       |
| ----------- | ----- | -------------------------- |
| CNAME       | `www` | `path-logic-xxxxx.web.app` |

5. Click **Save**

### 2.5 Add Storybook Subdomain

1. In Firebase Console → **Hosting** → select the **storybook** site
2. Click **"Add custom domain"**
3. Enter: `storybook.pathlogicfinance.com`
4. In Squarespace DNS, add:

| Record Type | Host        | Data                          |
| ----------- | ----------- | ----------------------------- |
| CNAME       | `storybook` | `pathlogic-storybook.web.app` |

5. Click **Save**

### 2.6 Add Staging Subdomain

1. In Firebase Console → switch to the **staging** project (`path-logic-staging`)
2. Go to **Hosting** → Click **"Add custom domain"**
3. Enter: `staging.pathlogicfinance.com`
4. Complete TXT verification (same process as 2.1–2.2)
5. In Squarespace DNS, add:

| Record Type | Host      | Data                         |
| ----------- | --------- | ---------------------------- |
| CNAME       | `staging` | `path-logic-staging.web.app` |

6. Click **Save**

### 2.7 Delete Vercel DNS Records

Once Firebase is verified and serving traffic (you can test by visiting `pathlogicfinance.com` after DNS propagation):

1. In Squarespace DNS, remove:
    - Any CNAME records pointing to `cname.vercel-dns.com`
    - Any A records with Vercel IPs (`76.76.21.21`)
    - Any TXT records for Vercel verification

### 2.7 SSL Certificate

Firebase automatically provisions and renews SSL certificates. No action needed. Allow up to 24 hours after DNS changes for the certificate to be provisioned.

---

## Part 3: Firebase Auth — Google Sign-In with Drive Scopes

### 3.1 Angular Integration

Install AngularFire:

```bash
npm install @angular/fire firebase
```

In `app.config.ts`:

```typescript
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { firebaseConfig } from '../environments/environment';

export const appConfig: ApplicationConfig = {
    providers: [
        provideFirebaseApp(() => initializeApp(firebaseConfig)),
        provideAuth(() => getAuth()),
        provideRouter(routes)
    ]
};
```

### 3.2 Sign-In with Drive Scope

```typescript
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.appdata');

    const result = await signInWithPopup(this.auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    // Store the access token for Google Drive API calls
    this.accessToken.set(credential?.accessToken ?? null);
}
```

> [!IMPORTANT]
> The Google Drive `accessToken` is obtained from the OAuth credential at sign-in. Store it in a signal for the sync service to use.

### 3.3 Authorized Domains

1. Firebase Console → **Authentication** → **Settings** tab
2. Under **Authorized domains**, ensure these are listed:
    - `pathlogicfinance.com`
    - `www.pathlogicfinance.com`
    - `path-logic-xxxxx.web.app`
    - `localhost`

---

## Part 4: GitHub Actions CI/CD for Firebase

### 4.1 Generate Firebase CI Token

```bash
firebase login:ci
```

Copy the token — it will be added as a GitHub secret.

### 4.2 Add GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret Name           | Value                              |
| --------------------- | ---------------------------------- |
| `FIREBASE_TOKEN`      | The token from `firebase login:ci` |
| `FIREBASE_PROJECT_ID` | `path-logic-xxxxx`                 |

### 4.3 Deploy Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Firebase
on:
    push:
        branches: [main]

jobs:
    deploy:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: 20
                  cache: npm
            - run: npm ci
            - run: npx nx build web --configuration=production
            - run: npx nx build-storybook web
            - uses: FirebaseExtended/action-hosting-deploy@v0
              with:
                  repoToken: ${{ secrets.GITHUB_TOKEN }}
                  firebaseServiceAccount: ${{ secrets.FIREBASE_TOKEN }}
                  channelId: live
                  projectId: ${{ secrets.FIREBASE_PROJECT_ID }}
```

### 4.4 Preview Deploys on PRs

```yaml
# .github/workflows/preview.yml
name: Firebase Preview
on: pull_request

jobs:
    preview:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: 20
                  cache: npm
            - run: npm ci
            - run: npx nx build web --configuration=production
            - uses: FirebaseExtended/action-hosting-deploy@v0
              with:
                  repoToken: ${{ secrets.GITHUB_TOKEN }}
                  firebaseServiceAccount: ${{ secrets.FIREBASE_TOKEN }}
                  projectId: ${{ secrets.FIREBASE_PROJECT_ID }}
                  # No channelId = creates a preview channel automatically
```

---

## Part 5: Cleanup & Maintenance

### 5.1 Environment Isolation

Ensure your Production and Staging Firebase projects remain separate:

- Use unique project IDs.
- Use unique `client_id` for Google OAuth in each project.
- Verify sync paths in GDrive are isolated via the `APP_ENV` variable.
