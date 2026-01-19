'use client';

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Database, Zap } from "lucide-react";

export function SignInButton(): React.JSX.Element {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Card className="max-w-md w-full border-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="text-center pb-8 pt-10">
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                        <span className="text-primary-foreground font-black text-xl">P</span>
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
                        Path <span className="text-primary">Logic</span>
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-xs uppercase tracking-[0.2em] mt-2">
                        Your Financial Data, Your Control
                    </CardDescription>
                </CardHeader>

                <CardContent className="px-8 pb-10">
                    <div className="space-y-5 mb-10">
                        <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent/30 transition-colors">
                            <ShieldCheck className="text-emerald-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-foreground">100% Private</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    All data encrypted client-side using AES-GCM 256-bit before storage.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent/30 transition-colors">
                            <Database className="text-emerald-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-foreground">You Own the Data</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Stored in your personal Google Drive. We never see it, and we never sell it.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent/30 transition-colors">
                            <Zap className="text-emerald-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-foreground">Next-Gen Performance</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Local-first architecture with SQLite-WASM for blazing fast interaction.
                                </p>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={(): void => {
                            void signIn("google", { callbackUrl: "/" });
                        }}
                        className="w-full text-foreground bg-white hover:bg-gray-100 font-bold py-6 rounded-md transition-all flex items-center justify-center gap-3 shadow-lg group"
                    >
                        <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
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

                    <p className="text-[10px] text-muted-foreground text-center mt-8 font-medium leading-relaxed max-w-[280px] mx-auto">
                        By signing in, you agree to store encrypted financial data in your Google Drive appDataFolder.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
