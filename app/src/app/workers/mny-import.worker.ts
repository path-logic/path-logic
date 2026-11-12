/**
 * @file mny-import.worker.ts
 * Dedicated Web Worker for off-thread Microsoft Money (.mny) database parsing,
 * page decryption, and record reassembly without blocking the main UI thread.
 */

import { MNYParser, type IMnyHeader, type IMnyParseResult } from '../core/parsers/MNYParser';
import type {
    MnyParseStage,
    MnyWorkerInboundMessage,
    MnyWorkerOutboundMessage
} from '../services/import-export/mny-migration.types';

let cancelled: boolean = false;

function post(msg: MnyWorkerOutboundMessage): void {
    self.postMessage(msg);
}

self.onmessage = (event: MessageEvent<MnyWorkerInboundMessage>): void => {
    const msg = event.data;

    if (msg.type === 'cancel') {
        cancelled = true;
        return;
    }

    if (msg.type === 'inspect') {
        cancelled = false;
        try {
            const parser: MNYParser = new MNYParser();
            const bytes: Uint8Array = new Uint8Array(msg.buffer);
            const password: string = msg.password ?? '';
            const username: string | undefined = msg.username;
            const emptyHeader: IMnyHeader = parser.parseHeader(bytes, '');
            const passwordRequired: boolean =
                emptyHeader.encryptAllPages && !emptyHeader.passwordVerified;
            const header: IMnyHeader =
                password.length > 0 || (username && username.length > 0)
                    ? parser.parseHeader(bytes, password, username)
                    : emptyHeader;
            const isVerified: boolean = header.encryptAllPages ? header.passwordVerified : true;

            let tableCount: number = 0;
            if (isVerified) {
                try {
                    const sysTdef = parser.readTableDef(bytes, 2, header);
                    const sysRows = parser.readTableRows(bytes, sysTdef, header);
                    tableCount = sysRows.filter(r => r['Type'] === 1).length;
                } catch {
                    let count: number = 0;
                    const numPages: number = Math.floor(bytes.byteLength / 4096);
                    for (let p: number = 15; p < numPages; p++) {
                        const off: number = p * 4096;
                        if (bytes[off] === 0x02 && bytes[off + 1] === 0x01) {
                            count++;
                        }
                    }
                    tableCount = count;
                }
            }

            post({
                type: 'inspected',
                header,
                passwordRequired,
                isVerified,
                tableCount
            });
        } catch (err: unknown) {
            post({
                type: 'error',
                code: 'INSPECT_FAILED',
                message: err instanceof Error ? err.message : 'Failed to inspect .mny file header'
            });
        }
        return;
    }

    if (msg.type === 'parse') {
        cancelled = false;
        try {
            const parser: MNYParser = new MNYParser();
            const bytes: Uint8Array = new Uint8Array(msg.buffer);
            const password: string = msg.password ?? '';
            const username: string | undefined = msg.username;

            const onProgress = (stage: string, pct: number, table?: string): void => {
                if (cancelled) return;
                post({
                    type: 'progress',
                    stage: stage as MnyParseStage,
                    percent: pct,
                    currentTable: table
                });
            };

            const result: IMnyParseResult = parser.parse(bytes, password, onProgress, username);

            if (cancelled) return;

            post({
                type: 'parse_complete',
                result
            });
        } catch (err: unknown) {
            post({
                type: 'error',
                code: 'PARSE_FAILED',
                message: err instanceof Error ? err.message : 'Failed to parse .mny file'
            });
        }
    }
};
