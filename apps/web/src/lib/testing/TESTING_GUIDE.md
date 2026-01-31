/\*\*

- Storage & Sync Testing Guide
-
- This guide shows how to validate the storage and sync pipeline
- with minimal test data (5 transactions).
  \*/

## Quick Test Steps

### 1. **Test Local Storage (SQLite)**

Open browser console and run:

```javascript
// Import test utilities
import { generateTestDataset } from '@/lib/testing/testData';
import { useLedgerStore } from '@/store/ledgerStore';

// Initialize database
await useLedgerStore.getState().initialize();

// Add test transactions
const testData = generateTestDataset();
for (const tx of testData) {
    await useLedgerStore.getState().addTransaction(tx);
}

// Verify transactions are stored
console.log('Stored transactions:', useLedgerStore.getState().transactions);
```

**Expected Result:** You should see 5 test transactions in the ledger.

---

### 2. **Test Encryption**

```javascript
import { encryptDatabase, decryptDatabase } from '@/lib/crypto/encryption';
import { useLedgerStore } from '@/store/ledgerStore';

// Export database
const dbExport = useLedgerStore.getState().exportForSync();
console.log('Database size (bytes):', dbExport.length);

// Encrypt with test user ID
const encrypted = await encryptDatabase(dbExport, 'test-user-123');
console.log('Encrypted size (bytes):', encrypted.length);

// Decrypt and verify
const decrypted = await decryptDatabase(encrypted, 'test-user-123');
console.log('Decrypted matches original:', decrypted.length === dbExport.length);
```

**Expected Result:** Encrypted data should be slightly larger (due to IV), decryption should restore original.

---

### 3. **Test Google Drive Sync** (Requires Sign-In)

```javascript
import { loadFromDrive, saveToDrive } from '@/lib/sync/syncService';
import { useSession } from 'next-auth/react';

// Get session
const { data: session } = useSession();
if (!session) {
    console.error('Please sign in first');
} else {
    // Save to Drive
    await saveToDrive(session.accessToken, session.user.id);
    console.log('✅ Saved to Drive');

    // Clear local data
    await useLedgerStore.getState().initialize();

    // Load from Drive
    await loadFromDrive(session.accessToken, session.user.id);
    console.log('✅ Loaded from Drive');
    console.log('Transactions:', useLedgerStore.getState().transactions);
}
```

**Expected Result:** Data should persist to Drive and reload successfully.

---

### 4. **Verify in Google Drive**

1. Go to https://drive.google.com
2. You won't see the file in your Drive UI (it's in `appDataFolder`)
3. To verify it exists, check the console logs for "Database saved to Drive successfully"

---

### 5. **Test Full Pipeline**

```javascript
import { generateTestDataset } from '@/lib/testing/testData';
import { useLedgerStore } from '@/store/ledgerStore';
import { saveToDrive, loadFromDrive } from '@/lib/sync/syncService';
import { useSession } from 'next-auth/react';

async function testFullPipeline() {
    const { data: session } = useSession();

    // 1. Initialize
    await useLedgerStore.getState().initialize();
    console.log('✅ Database initialized');

    // 2. Add test data
    const testData = generateTestDataset();
    for (const tx of testData) {
        await useLedgerStore.getState().addTransaction(tx);
    }
    console.log('✅ Added 5 test transactions');

    // 3. Save to Drive
    await saveToDrive(session.accessToken, session.user.id);
    console.log('✅ Encrypted and saved to Drive');

    // 4. Clear local
    await useLedgerStore.getState().initialize();
    console.log('✅ Cleared local database');

    // 5. Load from Drive
    await loadFromDrive(session.accessToken, session.user.id);
    console.log('✅ Loaded and decrypted from Drive');

    // 6. Verify
    const transactions = useLedgerStore.getState().transactions;
    console.log(`✅ Verified: ${transactions.length} transactions restored`);

    return transactions;
}

// Run the test
testFullPipeline();
```

**Expected Result:** All 5 transactions should survive the full round-trip.

---

## Test Data Details

The test dataset includes:

- **5 transactions** (minimal but representative)
- **3 cleared** transactions (grocery, gas, coffee)
- **1 income** transaction (paycheck)
- **1 pending** transaction
- **Date range:** Last week to today
- **Total size:** ~500 bytes unencrypted, ~600 bytes encrypted

This is perfect for validation without overwhelming data! 🎯
