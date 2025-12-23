/**
 * Server-side Supabase client with Service Role key
 * Bypasses RLS for API routes that need admin access
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serviceRoleClient: SupabaseClient | null = null;

/**
 * Creates a Supabase client with Service Role key (admin access)
 * Use ONLY in server-side code (API routes, server components)
 * This client bypasses Row Level Security (RLS)
 */
export function createServiceRoleClient(): SupabaseClient {
    // Return cached client if available
    if (serviceRoleClient) {
        return serviceRoleClient;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            'Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
        );
    }

    serviceRoleClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    return serviceRoleClient;
}

/**
 * Creates a fresh service role client (not cached)
 * Use when you need isolation between requests
 */
export function createFreshServiceRoleClient(): SupabaseClient {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            'Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
        );
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}
