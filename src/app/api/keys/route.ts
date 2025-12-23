import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';
import { createApiKey, listApiKeys, revokeApiKey } from '@/lib/db/apiKeys';
import { createServiceRoleClient } from '@/lib/supabaseServer';

// Debug logging
const DEBUG = process.env.NODE_ENV === 'development';
const log = (...args: unknown[]) => DEBUG && console.log(...args);

// Initialize Supabase client with header-based or cookie-based auth
async function getAuthenticatedSupabase(): Promise<SupabaseClient | null> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[api/keys] Missing Supabase configuration');
        return null;
    }

    // Get auth token from Authorization header or cookies
    const cookieStore = await cookies();
    const headersStore = await headers();
    
    // Check for Authorization header (Bearer token) - preferred method
    const authHeader = headersStore.get('authorization');
    
    const options: Record<string, unknown> = {
        global: {
            headers: {} as Record<string, string>
        }
    };

    if (authHeader) {
        // Use explicitly provided token
        log('[api/keys] Using Authorization header');
        (options.global as Record<string, Record<string, string>>).headers['Authorization'] = authHeader;
    } else {
        // Fallback to cookies
        const allCookies = cookieStore.getAll();
        log('[api/keys] Using cookies, count:', allCookies.length);
        
        if (allCookies.length > 0) {
            (options.global as Record<string, Record<string, string>>).headers['Cookie'] = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
        }
    }

    return createClient(supabaseUrl, supabaseAnonKey, options);
}

// GET: List API keys
export async function GET(request: NextRequest) {
    try {
        const supabase = await getAuthenticatedSupabase();
        if (!supabase) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use service role client for SELECT to bypass RLS
        const serviceClient = createServiceRoleClient();
        const keys = await listApiKeys(user.id, serviceClient);
        return NextResponse.json({ success: true, data: keys });
    } catch (error) {
        console.error('[api/keys] GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Create new API key
export async function POST(request: NextRequest) {
    try {
        const supabase = await getAuthenticatedSupabase();
        if (!supabase) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Use service role client for INSERT to bypass RLS
        const serviceClient = createServiceRoleClient();
        const result = await createApiKey(name, user.id, serviceClient);
        
        if (!result) {
            return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch (error) {
        console.error('[api/keys] POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Revoke API key
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await getAuthenticatedSupabase();
        if (!supabase) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const keyId = searchParams.get('id');

        if (!keyId) {
            return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
        }

        // Use service role client for UPDATE to bypass RLS
        const serviceClient = createServiceRoleClient();
        const success = await revokeApiKey(keyId, user.id, serviceClient);
        
        if (!success) {
            return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[api/keys] DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
