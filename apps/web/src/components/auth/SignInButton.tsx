'use client';

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignInButton(): React.JSX.Element {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F1115] text-white">
            <div className="max-w-md w-full px-8 py-12 bg-[#1E293B] rounded-lg border border-[#334155] shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-[#38BDF8] mb-2">Path Logic</h1>
                    <p className="text-[#94A3B8] text-sm uppercase tracking-wider">
                        Your Financial Data, Your Control
                    </p>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3">
                        <div className="text-[#10B981] mt-1">✓</div>
                        <div>
                            <p className="text-sm font-semibold text-white">100% Private</p>
                            <p className="text-xs text-[#64748B]">
                                All data encrypted client-side before storage
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="text-[#10B981] mt-1">✓</div>
                        <div>
                            <p className="text-sm font-semibold text-white">You Own It</p>
                            <p className="text-xs text-[#64748B]">
                                Stored in your Google Drive, not our servers
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="text-[#10B981] mt-1">✓</div>
                        <div>
                            <p className="text-sm font-semibold text-white">No Subscriptions</p>
                            <p className="text-xs text-[#64748B]">
                                Pay once, own forever
                            </p>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={(): void => {
                        void signIn("google", { callbackUrl: "/" });
                    }}
                    className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 rounded-md transition-colors flex items-center justify-center gap-3"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Sign in with Google
                </Button>

                <p className="text-xs text-[#475569] text-center mt-6">
                    By signing in, you agree to store encrypted financial data in your Google Drive appDataFolder.
                </p>
            </div>
        </div>
    );
}
