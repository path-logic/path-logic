# Path Logic - Security & Privacy Trust Report

## 1. Google Drive appDataFolder Storage

### 1.1 How it Works

Path Logic uses the Google Drive `appDataFolder` to store your financial data.

- **Access**: Path Logic only has access to the files it creates within this hidden folder. It CANNOT see or access any other files in your Google Drive.
- **Location**: This folder is managed by Google Drive and is not visible to you in the standard Drive interface, ensuring your data is not accidentally deleted or modified.
- **Ownership**: You remain the sole owner of your data. If you delete your Google account or revoke access, the data is gone from our reach (though you have a local copy in your browser).

### 1.2 Security & Encryption

- **Client-Side Encryption**: Before any data is sent to Google Drive, it is encrypted in your browser using AES-GCM 256-bit encryption.
- **Master Key**: The encryption key is derived from your login session and a passphrase/secret known only to you. Path Logic servers never see your unencrypted data or your master key.
- **Zero-Knowledge**: Our infrastructure has no ability to decrypt your financial records.

## 2. Google SSO Integration

### 2.1 Permissions Requested

Path Logic requests the following scopes:

- `.../auth/userinfo.profile`: To personalize your experience.
- `.../auth/drive.appdata`: To save and sync your data securely.

### 2.2 Data Retention

- We do not store your Google credentials. Authentication is handled entirely by Google.
- We do not store your financial data on our servers. It lives in your browser (IndexedDB) and your Google Drive.

## 3. Official Documentation

For more information on the Google Drive `appDataFolder`, see the official Google developer documentation:
[Google Drive API - Store Application Data](https://developers.google.com/drive/api/guides/appdata)
