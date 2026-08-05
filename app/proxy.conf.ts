import type { IncomingMessage, ServerResponse } from 'node:http';

interface IRemoteLogPayload {
    level?: string;
    message?: string;
    details?: unknown;
    stack?: string;
    timestamp?: string;
}

/**
 * Dev Server Logging Proxy Configuration
 * Intercepts POST /api/log requests from the Angular app and writes them directly
 * to process.stdout or process.stderr so `npm run dev 2>&1 | tee ./tmp/path-logic.log`
 * captures all browser logs and exceptions in terminal output.
 */
const PROXY_CONFIG = {
    '/api/log': {
        target: 'https://localhost:4200',
        secure: false,
        bypass: (req: IncomingMessage, res: ServerResponse): boolean | undefined => {
            if (req.method === 'POST') {
                let body = '';
                req.on('data', (chunk: Buffer) => {
                    body += chunk.toString();
                });
                req.on('end', () => {
                    try {
                        const payload: IRemoteLogPayload = JSON.parse(body);
                        const level = (payload.level || 'log').toLowerCase();
                        const time = payload.timestamp || new Date().toISOString();
                        const msg = `[BROWSER ${time}] [${level.toUpperCase()}] ${payload.message || ''}`;

                        if (level === 'error' || level === 'warn') {
                            process.stderr.write(`${msg}\n`);
                            if (payload.stack) {
                                process.stderr.write(`${payload.stack}\n`);
                            }
                            if (payload.details) {
                                process.stderr.write(
                                    `${JSON.stringify(payload.details, null, 2)}\n`
                                );
                            }
                        } else {
                            process.stdout.write(`${msg}\n`);
                            if (payload.details) {
                                process.stdout.write(
                                    `${JSON.stringify(payload.details, null, 2)}\n`
                                );
                            }
                        }
                    } catch {
                        process.stdout.write(`[BROWSER RAW LOG] ${body}\n`);
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok' }));
                });
                return true; // Bypass target proxying
            }
            return undefined;
        }
    }
};

export default PROXY_CONFIG;
