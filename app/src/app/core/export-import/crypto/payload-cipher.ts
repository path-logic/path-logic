/**
 * Web Crypto API AES-GCM 256 Encryption & SHA-256 Hashing for Export/Import Package Data
 */

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH_BITS = 256;
const IV_LENGTH_BYTES = 12;

/**
 * Derive a 256-bit CryptoKey from a passphrase or seed string using SHA-256
 */
export async function deriveExportKey(passphrase: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(passphrase || 'path-logic-export-default-key');
    const hash = await crypto.subtle.digest('SHA-256', keyData);

    return await crypto.subtle.importKey(
        'raw',
        hash,
        { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH_BITS },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt string content into base64 AES-GCM payload with IV prepended
 */
export async function encryptPayload(content: string, passphrase: string): Promise<string> {
    const key = await deriveExportKey(passphrase);
    const encoder = new TextEncoder();
    const encodedContent = encoder.encode(content);

    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: ENCRYPTION_ALGORITHM, iv },
        key,
        encodedContent
    );

    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    return bytesToBase64(combined);
}

/**
 * Decrypt encrypted base64 payload into plain text string
 */
export async function decryptPayload(encryptedBase64: string, passphrase: string): Promise<string> {
    const combined = base64ToBytes(encryptedBase64);
    if (combined.byteLength < IV_LENGTH_BYTES) {
        throw new Error('Invalid encrypted payload: buffer too short');
    }

    const iv = combined.slice(0, IV_LENGTH_BYTES);
    const data = combined.slice(IV_LENGTH_BYTES);

    const key = await deriveExportKey(passphrase);
    let decryptedBuffer: ArrayBuffer;
    try {
        decryptedBuffer = await crypto.subtle.decrypt(
            { name: ENCRYPTION_ALGORITHM, iv },
            key,
            data
        );
    } catch {
        throw new Error('Decryption failed: Incorrect passphrase or corrupted payload ciphertext.');
    }

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
}

/**
 * Calculate SHA-256 hash string (hex encoded) for any text or Uint8Array
 */
export async function computeSHA256(data: string | Uint8Array): Promise<string> {
    const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const hashBuffer = await crypto.subtle.digest(
        'SHA-256',
        buffer.buffer as unknown as ArrayBuffer
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i] ?? 0);
    }
    return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
