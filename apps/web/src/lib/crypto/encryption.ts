/**
 * AES-GCM 256-bit encryption using Web Crypto API
 * 
 * Security Model:
 * - Master key is derived from user's Google ID using PBKDF2
 * - Each encryption uses a random IV (Initialization Vector)
 * - IV is prepended to ciphertext for decryption
 * - All operations happen client-side; server never sees keys or plaintext
 */

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Derive a 256-bit AES key from the user's Google ID
 */
export async function deriveKeyFromUserId(userId: string): Promise<CryptoKey> {
    // Convert user ID to bytes
    const encoder: TextEncoder = new TextEncoder();
    const userIdBytes = encoder.encode(userId);

    // Import as raw key material
    const keyMaterial: CryptoKey = await crypto.subtle.importKey(
        'raw',
        userIdBytes,
        'PBKDF2',
        false,
        ['deriveKey']
    );

    // Derive AES-GCM key using PBKDF2
    // Salt is hardcoded for deterministic key derivation from same user ID
    const salt = encoder.encode('path-logic-v1-salt');

    const key: CryptoKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        {
            name: 'AES-GCM',
            length: KEY_LENGTH,
        },
        false, // not extractable
        ['encrypt', 'decrypt']
    );

    return key;
}

/**
 * Encrypt data using AES-GCM
 * Returns: IV (12 bytes) + Ciphertext
 */
export async function encryptData(
    data: Uint8Array,
    key: CryptoKey
): Promise<Uint8Array> {
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encrypt
    const ciphertext: ArrayBuffer = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv,
        },
        key,
        data
    );

    // Prepend IV to ciphertext
    const result: Uint8Array = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(ciphertext), IV_LENGTH);

    return result;
}

/**
 * Decrypt data using AES-GCM
 * Expects: IV (12 bytes) + Ciphertext
 */
export async function decryptData(
    encryptedData: Uint8Array,
    key: CryptoKey
): Promise<Uint8Array> {
    // Extract IV from first 12 bytes
    const iv = encryptedData.slice(0, IV_LENGTH);
    const ciphertext = encryptedData.slice(IV_LENGTH);

    // Decrypt
    const plaintext: ArrayBuffer = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv,
        },
        key,
        ciphertext
    );

    return new Uint8Array(plaintext);
}

/**
 * Encrypt SQLite database export for storage
 */
export async function encryptDatabase(
    dbExport: Uint8Array,
    userId: string
): Promise<Uint8Array> {
    const key: CryptoKey = await deriveKeyFromUserId(userId);
    return encryptData(dbExport, key);
}

/**
 * Decrypt SQLite database from storage
 */
export async function decryptDatabase(
    encryptedDb: Uint8Array,
    userId: string
): Promise<Uint8Array> {
    const key: CryptoKey = await deriveKeyFromUserId(userId);
    return decryptData(encryptedDb, key);
}
