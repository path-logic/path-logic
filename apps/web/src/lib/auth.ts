import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, signIn, signOut, auth } = NextAuth({
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
    ],
    callbacks: {
        async jwt({ token, account }) {
            // Persist the OAuth access_token to the token right after signin
            if (account) {
                token['accessToken'] = account.access_token;
                token['refreshToken'] = account.refresh_token;
            }
            return token;
        },
        async session({ session, token }) {
            // Send properties to the client
            session.accessToken = token['accessToken'] as string;
            session.user.id = token.sub as string;
            return session;
        },
    },
});
