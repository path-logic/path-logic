# Developer Sync Test Suite - Usage Guide

## Overview

The Developer Sync Test Suite provides a comprehensive UI for manually testing and verifying the complete data sync pipeline in Path Logic.

## Access

**URL**: `http://localhost:3000/dev/sync-test`

**Requirements**:
- Must be running in development mode (`NODE_ENV=development`)
- Must be signed in with Google OAuth

## Features

### 1. Test Data Management

**Load Default Test Data**
- Click "Load Test Transactions" to add 5 pre-defined test transactions
- Includes various transaction types (expenses, income, pending)

**Create Custom Transactions**
- Enter Payee, Amount, and optional Memo
- Click "Create Transaction" to add to the ledger
- Useful for testing specific scenarios

**View Current Data**
- Transaction count and total amount displayed
- Full transaction list with date, payee, and amount

### 2. Data Export & Encryption

**Export SQLite Data**
- Exports the current database to binary format
- Displays raw data in hex format
- Shows file size

**Encrypt Data**
- Encrypts the exported data using AES-GCM
- Uses your Google user ID as the encryption key
- Shows encrypted blob with IV prepended

**Upload to Google Drive**
- Uploads encrypted database to your Google Drive appDataFolder
- Displays file metadata (ID, modified time)
- Triggers automatic sync

### 3. Sync Status

Real-time sync status panel shows:
- Current sync state (Idle/Syncing)
- Last sync timestamp
- Any errors that occur

### 4. Download & Restore

**Download from Google Drive**
- Downloads encrypted database from Drive
- Automatically decrypts using your user ID
- Restores transactions to the ledger

**Data Integrity Verification**
- Compares original vs. restored transactions
- Shows ✓ if data matches perfectly
- Lists specific differences if mismatch detected

## Testing Workflow

### Basic Round-Trip Test

1. **Load Test Data**
   - Click "Load Test Transactions"
   - Verify 5 transactions appear

2. **Upload to Drive**
   - Click "Upload to Google Drive"
   - Wait for sync to complete
   - Verify Google Drive metadata appears

3. **Clear Local Data**
   - Refresh the page (clears in-memory database)
   - Verify transaction count is 0

4. **Download from Drive**
   - Click "Download from Google Drive"
   - Verify transactions are restored
   - Check for ✓ "Data matches perfectly!"

### Custom Data Test

1. **Create Custom Transaction**
   - Enter: Payee="Test Store", Amount="99.99", Memo="Testing"
   - Click "Create Transaction"

2. **Verify in List**
   - Check transaction appears in the table

3. **Sync & Restore**
   - Upload to Drive
   - Refresh page
   - Download from Drive
   - Verify custom transaction is restored

### Encryption Inspection

1. **Export Data**
   - Click "Export SQLite Data"
   - View raw binary data in hex format

2. **Encrypt Data**
   - Click "Encrypt Data"
   - Compare encrypted vs. raw data
   - Note the IV (first 12 bytes) is random

## Data Inspection Panels

### Raw SQLite Export
- Shows unencrypted database binary
- First 200 bytes displayed in hex
- Copy to clipboard available

### Encrypted Data
- Shows AES-GCM encrypted blob
- IV (12 bytes) + Ciphertext
- First 200 bytes displayed in hex

### Google Drive Metadata
- File ID (for debugging)
- Last modified timestamp
- Appears after successful upload

## Troubleshooting

**"No session or access token"**
- Sign in with Google OAuth
- Refresh the page

**"Failed to upload to Drive"**
- Check browser console for details
- Verify Google Drive API is enabled
- Check OAuth scopes include Drive access

**Data mismatch after restore**
- Check for errors in sync status panel
- Verify encryption key (user ID) is consistent
- Check browser console for decryption errors

**"Access Denied" in production**
- This route is development-only
- Set `NODE_ENV=development` to access

## Security Notes

- All encryption happens client-side
- Your encryption key is derived from your Google user ID
- Encrypted data is stored in Google Drive's appDataFolder
- appDataFolder is hidden from users and deleted when app is uninstalled
- No sensitive data is logged to console (only metadata)
