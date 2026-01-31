'use client';

import { useEffect } from 'react';

export default function AuthSuccessPage(): React.ReactElement {
    useEffect(() => {
        if (window.opener) {
            // Notify the parent window
            window.opener.postMessage({ type: 'PATH_LOGIC_AUTH_SUCCESS' }, window.location.origin);

            // Close this popup
            window.close();
        }
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <h1 className="text-xl font-semibold mb-2">Authentication Successful</h1>
            <p className="text-muted-foreground">You can close this window now.</p>
        </div>
    );
}
