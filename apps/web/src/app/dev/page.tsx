import Link from 'next/link';

export default function DevIndexPage(): React.ReactElement {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Developer Tools</h1>
                <p className="mt-2 text-gray-600">
                    Internal tools for testing, debugging, and development
                </p>
            </div>

            <div className="grid gap-4">
                {/* Sync Test Suite */}
                <Link
                    href="/dev/sync-test"
                    className="block rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-blue-500 hover:shadow-md"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-xl font-semibold text-gray-900">Sync Test Suite</h2>
                            <p className="mt-2 text-sm text-gray-600">
                                Manually verify the complete data sync pipeline: SQLite → Encryption → Google Drive → Decryption
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                                    Data Sync
                                </span>
                                <span className="rounded bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">
                                    Encryption
                                </span>
                                <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                                    Google Drive
                                </span>
                            </div>
                        </div>
                        <svg
                            className="h-6 w-6 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </div>
                </Link>

                {/* Placeholder for future tools */}
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6">
                    <h2 className="text-lg font-semibold text-gray-500">More tools coming soon...</h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Additional developer tools will be added here as needed
                    </p>
                </div>
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-start gap-3">
                    <svg
                        className="h-5 w-5 text-yellow-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <div>
                        <h3 className="font-semibold text-yellow-900">Development Only</h3>
                        <p className="mt-1 text-sm text-yellow-700">
                            These tools are only accessible when the Developer Tools feature flag is enabled.
                            Disable the flag in Settings when not needed.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
