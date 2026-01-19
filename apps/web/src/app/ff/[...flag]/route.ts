import { NextRequest, NextResponse } from 'next/server';
import { setFlag, createFlagValidator } from '@/lib/featureFlags/featureFlags';
import { FlagKey } from '@/lib/featureFlags/flags';

/**
 * Dynamic route handler for feature flag toggling
 * 
 * Routes:
 * - GET /ff/[flag]/enable  - Enable a feature flag
 * - GET /ff/[flag]/disable - Disable a feature flag
 */

interface IRouteParams {
    params: Promise<{
        flag: Array<string>;
    }>;
}

// Create validator with allowed flags
const isValidFlag: (flag: string) => boolean = createFlagValidator(Object.values(FlagKey));

export async function GET(
    request: NextRequest,
    { params }: IRouteParams
): Promise<NextResponse> {
    const resolvedParams: { flag: Array<string> } = await params;
    const segments: Array<string> = resolvedParams.flag;

    // Parse URL: /ff/[flag]/[action]
    if (segments.length !== 2) {
        return NextResponse.json(
            { error: 'Invalid route. Use /ff/[flag]/enable or /ff/[flag]/disable' },
            { status: 400 }
        );
    }

    const [flag, action]: Array<string | undefined> = segments;

    if (!flag || !action) {
        return NextResponse.json(
            { error: 'Missing flag or action' },
            { status: 400 }
        );
    }

    // Validate flag name
    if (!isValidFlag(flag)) {
        return NextResponse.json(
            { error: `Invalid flag: ${flag}. Allowed flags: ${Object.values(FlagKey).join(', ')}` },
            { status: 400 }
        );
    }

    // Validate action
    if (action !== 'enable' && action !== 'disable') {
        return NextResponse.json(
            { error: 'Action must be "enable" or "disable"' },
            { status: 400 }
        );
    }

    // Set the flag
    const enabled: boolean = action === 'enable';
    await setFlag(flag, enabled);

    // Get referrer for redirect
    const referer: string | null = request.headers.get('referer');
    const redirectUrl: string = referer || '/';

    // Create response with redirect
    const response: NextResponse = NextResponse.redirect(new URL(redirectUrl, request.url));

    return response;
}
