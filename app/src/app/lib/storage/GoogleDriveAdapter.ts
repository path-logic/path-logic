/**
 * Google Drive API adapter for encrypted database sync
 *
 * Uses the appDataFolder scope for user-owned, app-specific storage.
 * The appDataFolder is hidden from the user and automatically deleted
 * when the app is uninstalled.
 */

import { environment } from '../../../environments/environment';
import { GDriveAuthError, notifyAuthFailure } from './errors';

const DRIVE_API_BASE: string = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_BASE: string = 'https://www.googleapis.com/upload/drive/v3';

/**
 * Get the environment-specific suffix for filenames
 */
function getEnvSuffix(): string {
    if (environment.appEnv === 'production') return '';
    return `-${environment.appEnv}`;
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

export interface IDriveFile {
    id: string;
    name: string;
    modifiedTime: string;
}

/** Timeout for all Drive API requests. Prevents indefinite hangs on stale tokens. */
const DRIVE_REQUEST_TIMEOUT_MS = 10_000;

/**
 * Fetch wrapper for all Google Drive API calls.
 * Applies a hard timeout via AbortController so stale/expired tokens
 * or network issues fail fast instead of hanging the UI indefinitely.
 */
async function driveApiFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), DRIVE_REQUEST_TIMEOUT_MS);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new Error(
                `Drive API request timed out after ${DRIVE_REQUEST_TIMEOUT_MS}ms: ${url}`
            );
        }
        throw err;
    } finally {
        clearTimeout(timerId);
    }
}

/**
 * Find the encrypted database file in appDataFolder
 */
export async function findDatabaseFile(accessToken: string): Promise<IDriveFile | null> {
    const response: Response = await driveApiFetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=name='${DB_FILENAME}'`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );

    if (!response.ok) {
        await handleResponseError(response, 'Failed to list files');
    }

    const data: { files: Array<IDriveFile> } = (await response.json()) as {
        files: Array<IDriveFile>;
    };
    const files = data.files;
    return files && files.length > 0 ? (files[0] ?? null) : null;
}

/**
 * Delete both database and lock files from Drive (Factory Reset)
 */
export async function factoryResetDrive(accessToken: string): Promise<void> {
    const filesResponse = await driveApiFetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=(name='${DB_FILENAME}' or name='${LOCK_FILENAME}')`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );

    if (!filesResponse.ok) {
        await handleResponseError(filesResponse, 'Failed to list files for reset');
    }

    const { files } = (await filesResponse.json()) as { files: Array<IDriveFile> };

    for (const file of files) {
        const deleteResponse = await driveApiFetch(`${DRIVE_API_BASE}/files/${file.id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
            await handleResponseError(deleteResponse, `Failed to delete file: ${file.name}`);
        }
    }
}

/**
 * Download the encrypted database from Drive
 */
export async function downloadDatabase(accessToken: string, fileId: string): Promise<Uint8Array> {
    const response: Response = await driveApiFetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
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
    existingFileId?: string
): Promise<string> {
    const metadata: { name: string; parents?: Array<string> } = {
        name: DB_FILENAME
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

    const response: Response = await driveApiFetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${accessToken}`
        },
        body: form
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
    const response: Response = await driveApiFetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=name='${LOCK_FILENAME}'&fields=files(id,name,modifiedTime)`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );

    if (!response.ok) {
        await handleResponseError(response, 'Failed to list lock files');
    }

    const data: { files: Array<{ id: string }> } = (await response.json()) as {
        files: Array<{ id: string }>;
    };
    if (data.files.length === 0) return null;

    const firstFile = data.files[0];
    if (!firstFile) return null;

    const fileId: string = firstFile.id;
    const fileResponse: Response = await driveApiFetch(
        `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );

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
    deviceName: string
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
        status: 'merging'
    };

    const metadata = {
        name: LOCK_FILENAME,
        parents: ['appDataFolder']
    };

    const searchResponse: Response = await driveApiFetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=name='${LOCK_FILENAME}'`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );

    if (!searchResponse.ok) {
        await handleResponseError(searchResponse, 'Failed to search for locks');
    }

    const searchData: { files?: Array<{ id: string }> } = await searchResponse.json();
    if (searchData.files && Array.isArray(searchData.files)) {
        for (const file of searchData.files) {
            await driveApiFetch(`${DRIVE_API_BASE}/files/${file.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` }
            });
        }
    }

    const form: FormData = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(lockStatus)], { type: 'application/json' }));

    const response: Response = await driveApiFetch(
        `${UPLOAD_API_BASE}/files?uploadType=multipart`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            body: form
        }
    );

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
    const response: Response = await driveApiFetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=name='${LOCK_FILENAME}'`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );

    if (!response.ok) {
        await handleResponseError(response, 'Failed to list locks for release');
    }

    const data: { files?: Array<{ id: string }> } = await response.json();

    if (data.files && Array.isArray(data.files)) {
        for (const file of data.files) {
            // We could verify clientId here, but usually, if you're releasing, you know what you're doing.
            // For safety, let's just delete the file.
            await driveApiFetch(`${DRIVE_API_BASE}/files/${file.id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
        }
    }
}

/**
 * Forcibly release a lock (manual override)
 */
export async function forceReleaseLock(accessToken: string): Promise<void> {
    const response: Response = await driveApiFetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=name='${LOCK_FILENAME}'`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );

    if (!response.ok) {
        await handleResponseError(response, 'Failed to list locks for force release');
    }

    const data: { files?: Array<{ id: string }> } = await response.json();

    if (data.files && Array.isArray(data.files)) {
        for (const file of data.files) {
            await driveApiFetch(`${DRIVE_API_BASE}/files/${file.id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
        }
    }
}

// ── Export Package GDrive Management Functions ──────────────────────────────────────────

const EXPORTS_ROOT_FOLDER_NAME = `Path Logic Exports${getEnvSuffix()}`;

/**
 * Ensures the parent "Path Logic Exports" folder exists in appDataFolder scope and returns its file ID.
 */
export async function ensureExportsParentFolder(accessToken: string): Promise<string> {
    const q = `mimeType='application/vnd.google-apps.folder' and name='${EXPORTS_ROOT_FOLDER_NAME}' and trashed=false and 'appDataFolder' in parents`;
    const response = await driveApiFetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=${encodeURIComponent(q)}`,
        {
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    );

    if (!response.ok) {
        await handleResponseError(response, 'Failed to find export parent folder');
    }

    const data = (await response.json()) as { files?: Array<{ id: string }> };
    if (data.files && data.files.length > 0 && data.files[0]?.id) {
        return data.files[0].id;
    }

    // Create root folder in appDataFolder
    const createResponse = await driveApiFetch(`${DRIVE_API_BASE}/files`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: EXPORTS_ROOT_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['appDataFolder']
        })
    });

    if (!createResponse.ok) {
        await handleResponseError(createResponse, 'Failed to create export parent folder');
    }

    const created = (await createResponse.json()) as { id: string };
    return created.id;
}

/**
 * Creates a unique export package folder (e.g. "20260808" or "20260808_01") inside "Path Logic Exports".
 */
export async function createExportPackageFolder(
    accessToken: string,
    baseFolderName: string
): Promise<{ id: string; name: string }> {
    const parentId = await ensureExportsParentFolder(accessToken);

    // List existing subfolders to avoid overwriting and compute non-conflicting suffix if needed
    const q = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const listRes = await driveApiFetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=${encodeURIComponent(q)}`,
        {
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    );

    let finalFolderName = baseFolderName;
    if (listRes.ok) {
        const data = (await listRes.json()) as { files?: Array<{ name: string }> };
        const existingNames = new Set((data.files || []).map(f => f.name));

        if (existingNames.has(baseFolderName)) {
            let counter = 1;
            while (existingNames.has(`${baseFolderName}_${String(counter).padStart(2, '0')}`)) {
                counter++;
            }
            finalFolderName = `${baseFolderName}_${String(counter).padStart(2, '0')}`;
        }
    }

    const createResponse = await driveApiFetch(`${DRIVE_API_BASE}/files`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: finalFolderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
        })
    });

    if (!createResponse.ok) {
        await handleResponseError(createResponse, 'Failed to create export package folder');
    }

    const created = (await createResponse.json()) as { id: string };
    return { id: created.id, name: finalFolderName };
}

/**
 * Lists all export package folders inside "Path Logic Exports".
 */
export async function listExportPackageFolders(accessToken: string): Promise<Array<IDriveFile>> {
    const parentId = await ensureExportsParentFolder(accessToken);
    const q = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    const response = await driveApiFetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)`,
        {
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    );

    if (!response.ok) {
        await handleResponseError(response, 'Failed to list export package folders');
    }

    const data = (await response.json()) as { files?: Array<IDriveFile> };
    return data.files || [];
}

/**
 * Lists all files inside a specific export package folder.
 */
export async function listFilesInPackageFolder(
    accessToken: string,
    folderId: string
): Promise<Array<IDriveFile>> {
    const q = `'${folderId}' in parents and trashed=false`;

    const response = await driveApiFetch(
        `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)`,
        {
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    );

    if (!response.ok) {
        await handleResponseError(response, 'Failed to list files in package folder');
    }

    const data = (await response.json()) as { files?: Array<IDriveFile> };
    return data.files || [];
}

/**
 * Uploads a text or JSON file into an export package folder.
 */
export async function uploadExportFileToFolder(
    accessToken: string,
    folderId: string,
    name: string,
    mimeType: string,
    content: string
): Promise<IDriveFile> {
    const metadata = {
        name,
        mimeType,
        parents: [folderId]
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        content +
        closeDelimiter;

    const response = await driveApiFetch(
        `${UPLOAD_API_BASE}/files?uploadType=multipart&spaces=appDataFolder`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: multipartRequestBody
        }
    );

    if (!response.ok) {
        await handleResponseError(response, `Failed to upload export file ${name}`);
    }

    return (await response.json()) as IDriveFile;
}

/**
 * Downloads file text content by file ID.
 */
export async function downloadExportFileContent(
    accessToken: string,
    fileId: string
): Promise<string> {
    const response = await driveApiFetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        await handleResponseError(response, `Failed to download file content ${fileId}`);
    }

    return await response.text();
}

/**
 * Deletes an export package folder (and all files inside it) by folder ID.
 */
export async function deleteExportPackageFolder(
    accessToken: string,
    folderId: string
): Promise<void> {
    const response = await driveApiFetch(`${DRIVE_API_BASE}/files/${folderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok && response.status !== 404) {
        await handleResponseError(response, `Failed to delete export folder ${folderId}`);
    }
}
