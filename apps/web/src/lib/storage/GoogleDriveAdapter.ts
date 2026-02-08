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

/**
 * Get the environment-specific suffix for filenames
 */
function getEnvSuffix(): string {
    const env = process.env['NEXT_PUBLIC_APP_ENV'] || 'development';
    if (env === 'production') return '';
    return `-${env}`;
}

const DB_FILENAME: string = `path-logic-ledger${getEnvSuffix()}.db.enc`;
const LOCK_FILENAME: string = `sync-lock${getEnvSuffix()}.json`;

/**
 * Helper to handle GDrive API response errors
 */
async function handleResponseError(response: Response, defaultMessage: string): Promise<never> {
    let errorMessage = `${defaultMessage}: ${response.status} ${response.statusText}`;
    try {
        const errorData = await response.json();
        errorMessage += ` - ${JSON.stringify(errorData)}`;
    } catch {
        // Ignore parse error
    }

    if (response.status === 401 || response.status === 403) {
        notifyAuthFailure(response.status);
        throw new GDriveAuthError(errorMessage, response.status);
    }
    throw new Error(errorMessage);
}

export interface ILockStatus {
    clientId: string;
    deviceName: string;
    issuedAt: string;
    expiresAt: string;
    status: 'merging';
}

interface IDriveFile {
    id: string;
    name: string;
    modifiedTime: string;
}

/**
 * Find the encrypted database file in appDataFolder
 */
export async function findDatabaseFile(accessToken: string): Promise<IDriveFile | null> {
    const response: Response = await fetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=name='${DB_FILENAME}'`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    if (!response.ok) {
        await handleResponseError(response, 'Failed to list files');
    }

    const data: { files: Array<IDriveFile> } = (await response.json()) as {
        files: Array<IDriveFile>;
    };
    return data.files.length > 0 ? data.files[0]! : null;
}

/**
 * Download the encrypted database from Drive
 */
export async function downloadDatabase(accessToken: string, fileId: string): Promise<Uint8Array> {
    const response: Response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        await handleResponseError(response, 'Failed to download file');
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
    existingFileId?: string,
): Promise<string> {
    const metadata: { name: string; parents?: Array<string> } = {
        name: DB_FILENAME,
    };

    if (!existingFileId) {
        metadata.parents = new Array<string>('appDataFolder');
    }

    const form: FormData = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
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
        await handleResponseError(response, 'Failed to upload file');
    }

    const result: { id: string } = (await response.json()) as { id: string };
    return result.id;
}

/**
 * Get current lock status from Drive
 */
export async function getLockStatus(accessToken: string): Promise<ILockStatus | null> {
    const response: Response = await fetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=name='${LOCK_FILENAME}'&fields=files(id,name,modifiedTime)`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    if (!response.ok) {
        await handleResponseError(response, 'Failed to list lock files');
    }

    const data: { files: Array<{ id: string }> } = (await response.json()) as {
        files: Array<{ id: string }>;
    };
    if (data.files.length === 0) return null;

    const fileId: string = data.files[0]!.id;
    const fileResponse: Response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!fileResponse.ok) {
        await handleResponseError(fileResponse, 'Failed to download lock');
    }

    try {
        return (await fileResponse.json()) as ILockStatus;
    } catch {
        return null;
    }
}

/**
 * Acquire a sync lock on Drive
 */
export async function acquireLock(
    accessToken: string,
    clientId: string,
    deviceName: string,
): Promise<boolean> {
    // 1. Check for existing lock
    const existingLock = await getLockStatus(accessToken);
    if (existingLock) {
        const now = new Date();
        const expiresAt = new Date(existingLock.expiresAt);

        // If lock is held by someone else and hasn't expired, we can't acquire it
        if (existingLock.clientId !== clientId && now < expiresAt) {
            return false;
        }
    }

    // 2. Upload new lock
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minute TTL

    const lockStatus: ILockStatus = {
        clientId,
        deviceName,
        issuedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        status: 'merging',
    };

    const metadata = {
        name: LOCK_FILENAME,
        parents: ['appDataFolder'],
    };

    const searchResponse: Response = await fetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=name='${LOCK_FILENAME}'`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    if (!searchResponse.ok) {
        await handleResponseError(searchResponse, 'Failed to search for locks');
    }

    const searchData: { files?: Array<{ id: string }> } = await searchResponse.json();
    if (searchData.files && Array.isArray(searchData.files)) {
        for (const file of searchData.files) {
            await fetch(`${DRIVE_API_BASE}/files/${file.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
            });
        }
    }

    const form: FormData = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(lockStatus)], { type: 'application/json' }));

    const response: Response = await fetch(`${UPLOAD_API_BASE}/files?uploadType=multipart`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        body: form,
    });

    if (!response.ok) {
        await handleResponseError(response, 'Failed to create lock');
    }

    // 3. Concurrency Check: Wait 500ms and re-verify we are the holder
    await new Promise(resolve => setTimeout(resolve, 500));
    const verifiedLock = await getLockStatus(accessToken);

    return verifiedLock?.clientId === clientId;
}

/**
 * Release a sync lock on Drive
 */
export async function releaseLock(accessToken: string): Promise<void> {
    const response: Response = await fetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=name='${LOCK_FILENAME}'`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    if (!response.ok) {
        await handleResponseError(response, 'Failed to list locks for release');
    }

    const data: { files?: Array<{ id: string }> } = await response.json();

    if (data.files && Array.isArray(data.files)) {
        for (const file of data.files) {
            // We could verify clientId here, but usually, if you're releasing, you know what you're doing.
            // For safety, let's just delete the file.
            await fetch(`${DRIVE_API_BASE}/files/${file.id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
        }
    }
}

/**
 * Forcibly release a lock (manual override)
 */
export async function forceReleaseLock(accessToken: string): Promise<void> {
    const response: Response = await fetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=name='${LOCK_FILENAME}'`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    if (!response.ok) {
        await handleResponseError(response, 'Failed to list locks for force release');
    }

    const data: { files?: Array<{ id: string }> } = await response.json();

    if (data.files && Array.isArray(data.files)) {
        for (const file of data.files) {
            await fetch(`${DRIVE_API_BASE}/files/${file.id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
        }
    }
}
