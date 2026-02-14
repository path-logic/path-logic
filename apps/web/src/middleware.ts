import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import type { Session } from 'next-auth';

/**
 * Next.js Proxy for route protection.
 */
export default auth((req: NextRequest & { auth: Session | null }) => {
    const isLoggedIn = !!req.auth;
    const { pathname } = req.nextUrl;

    const isPrivatePath = pathname.startsWith('/accounts') || pathname.startsWith('/settings');

    if (isPrivatePath && !isLoggedIn) {
        return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
});

// See "Matching Paths" below to learn more
export const config = {
    matcher: ['/accounts/:path*', '/settings/:path*'],
};
