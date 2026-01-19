/**
 * Google Drive API adapter for encrypted database sync
 * 
 * Uses the appDataFolder scope for user-owned, app-specific storage.
 * The appDataFolder is hidden from the user and automatically deleted
 * when the app is uninstalled.
 */

import { GDriveAuthError, notifyAuthFailure } from './errors';

const DRIVE_API_BASE: string = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_BASE: string = 'https://www.googleapis.com/upload/drive/v3';
const DB_FILENAME: string = 'path-logic-ledger.db.enc';

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
    const response: Response = await fetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=name='${DB_FILENAME}'`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        let errorMessage = `Failed to list files: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMessage += ` - ${JSON.stringify(errorData)}`;
        } catch (e) {
            // Ignore parse error
        }

        if (response.status === 401 || response.status === 403) {
            notifyAuthFailure(response.status);
            throw new GDriveAuthError(errorMessage, response.status);
        }
        throw new Error(errorMessage);
    }

    const data: { files: Array<IDriveFile> } = (await response.json()) as { files: Array<IDriveFile> };
    return data.files.length > 0 ? data.files[0]! : null;
}

/**
 * Download the encrypted database from Drive
 */
export async function downloadDatabase(
    accessToken: string,
    fileId: string
): Promise<Uint8Array> {
    const response: Response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        let errorMessage = `Failed to download file: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMessage += ` - ${JSON.stringify(errorData)}`;
        } catch (e) {
            // Ignore parse error
        }

        if (response.status === 401 || response.status === 403) {
            notifyAuthFailure(response.status);
            throw new GDriveAuthError(errorMessage, response.status);
        }
        throw new Error(errorMessage);
    }

    const arrayBuffer: ArrayBuffer = await response.arrayBuffer();
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
    const metadata: { name: string; parents?: Array<string> } = {
        name: DB_FILENAME,
    };

    if (!existingFileId) {
        metadata.parents = new Array<string>('appDataFolder');
    }

    const form: FormData = new FormData();
    form.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append('file', new Blob([encryptedData as BlobPart]), DB_FILENAME);

    const url: string = existingFileId
        ? `${UPLOAD_API_BASE}/files/${existingFileId}?uploadType=multipart`
        : `${UPLOAD_API_BASE}/files?uploadType=multipart`;

    const method: string = existingFileId ? 'PATCH' : 'POST';

    const response: Response = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        body: form,
    });

    if (!response.ok) {
        let errorMessage = `Failed to upload file: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMessage += ` - ${JSON.stringify(errorData)}`;
        } catch (e) {
            // Ignore parse error
        }

        if (response.status === 401 || response.status === 403) {
            notifyAuthFailure(response.status);
            throw new GDriveAuthError(errorMessage, response.status);
        }
        throw new Error(errorMessage);
    }

    const result: { id: string } = (await response.json()) as { id: string };
    return result.id;
}

/**
 * Delete the database file from Drive
 */
export async function deleteDatabaseFile(
    accessToken: string,
    fileId: string
): Promise<void> {
    const response: Response = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok && response.status !== 404) {
        let errorMessage = `Failed to delete file: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMessage += ` - ${JSON.stringify(errorData)}`;
        } catch (e) {
            // Ignore parse error
        }

        if (response.status === 401 || response.status === 403) {
            notifyAuthFailure(response.status);
            throw new GDriveAuthError(errorMessage, response.status);
        }
        throw new Error(errorMessage);
    }
}
