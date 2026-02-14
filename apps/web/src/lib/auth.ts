import NextAuth, { type Session, type Account } from 'next-auth';
import { type JWT } from 'next-auth/jwt';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

const isProduction = process.env['NODE_ENV'] === 'production';
const isVercelProduction = process.env['NEXT_PUBLIC_VERCEL_ENV'] === 'production';

export const { handlers, signIn, signOut, auth } = NextAuth({
    cookies: {
        sessionToken: {
            name: isProduction ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: isProduction,
                ...(isVercelProduction ? { domain: '.pathlogicfinance.com' } : {}),
            },
        },
    },
    providers: [
        Google({
            clientId: process.env['GOOGLE_CLIENT_ID']!,
            clientSecret: process.env['GOOGLE_CLIENT_SECRET']!,

            authorization: {
                params: {
                    scope: [
                        'openid',
                        'https://www.googleapis.com/auth/userinfo.email',
                        'https://www.googleapis.com/auth/userinfo.profile',
                        'https://www.googleapis.com/auth/drive.appdata',
                    ].join(' '),
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        }),
        Credentials({
            name: 'Credentials',
            credentials: {
                username: { label: 'Username', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                const storybookUser = process.env['STORYBOOK_USERNAME'];
                const storybookPass = process.env['STORYBOOK_PASSWORD'];

                if (
                    storybookUser &&
                    storybookPass &&
                    credentials?.username === storybookUser &&
                    credentials?.password === storybookPass
                ) {
                    return {
                        id: 'storybook-admin',
                        name: 'Storybook Admin',
                        email: 'admin@storybook.local',
                    };
                }
                return null;
            },
        }),
    ],
    trustHost: true,
    callbacks: {
        async jwt({ token, account }: { token: JWT; account?: Account | null }) {
            // Persist the OAuth access_token to the token right after signin
            if (account) {
                token['accessToken'] = account.access_token;
                token['refreshToken'] = account.refresh_token;
                token['provider'] = account.provider;
            }
            return token;
        },
        async session({ session, token }: { session: Session; token: JWT }) {
            // Send properties to the client
            const extendedSession = session as Session & {
                accessToken?: string;
                user: { id?: string };
                provider?: string;
            };
            extendedSession.accessToken = token['accessToken'] as string;
            extendedSession.user.id = token.sub as string;
            extendedSession.provider = token['provider'] as string;
            return session;
        },
    },
});
