/**
 * Google Drive API adapter for encrypted database sync
 * 
 * Uses the appDataFolder scope for user-owned, app-specific storage.
 * The appDataFolder is hidden from the user and automatically deleted
 * when the app is uninstalled.
 */

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';
const DB_FILENAME = 'path-logic-ledger.db.enc';

interface IDriveFile {
    id: string;
    name: string;
    modifiedTime: string;
}

/**
 * Find the encrypted database file in appDataFolder
 */
export async function findDatabaseFile(
    accessToken: string
): Promise<IDriveFile | null> {
    const response = await fetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=name='${DB_FILENAME}'`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to list files: ${response.statusText}`);
    }

    const data = (await response.json()) as { files: Array<IDriveFile> };
    return data.files.length > 0 ? data.files[0]! : null;
}

/**
 * Download the encrypted database from Drive
 */
export async function downloadDatabase(
    accessToken: string,
    fileId: string
): Promise<Uint8Array> {
    const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
}

/**
 * Upload encrypted database to Drive (create or update)
 */
export async function uploadDatabase(
    accessToken: string,
    encryptedData: Uint8Array,
    existingFileId?: string
): Promise<string> {
    const metadata = {
        name: DB_FILENAME,
        parents: ['appDataFolder'],
    };

    const form = new FormData();
    form.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append('file', new Blob([encryptedData]), DB_FILENAME);

    const url = existingFileId
        ? `${UPLOAD_API_BASE}/files/${existingFileId}?uploadType=multipart`
        : `${UPLOAD_API_BASE}/files?uploadType=multipart`;

    const method = existingFileId ? 'PATCH' : 'POST';

    const response = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        body: form,
    });

    if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    const result = (await response.json()) as { id: string };
    return result.id;
}

/**
 * Delete the database file from Drive
 */
export async function deleteDatabaseFile(
    accessToken: string,
    fileId: string
): Promise<void> {
    const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete file: ${response.statusText}`);
    }
}
