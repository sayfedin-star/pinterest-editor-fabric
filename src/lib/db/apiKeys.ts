import { supabase, isSupabaseConfigured, getCurrentUserId } from '../supabase';
import { generateApiKey } from '../auth/apiKeyAuth';
import { DbApiKey, DbApiKeyInsert } from '@/types/database.types';
import { SupabaseClient } from '@supabase/supabase-js';

export type ApiKeyListItem = Pick<DbApiKey, 'id' | 'name' | 'key_prefix' | 'is_active' | 'created_at' | 'last_used_at'>;

/**
 * Create a new API key for a user
 * @param name User-friendly name for the key
 * @param userId Optional - user ID for server-side calls (from API route auth)
 * @param client Optional - Supabase client (use service role client for server-side to bypass RLS)
 * @returns The generated key (shown once) and the DB record
 */
export async function createApiKey(
    name: string, 
    userId?: string, 
    client?: SupabaseClient
): Promise<{ key: string; apiKey: DbApiKey } | null> {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured');
        return null;
    }

    // Use provided userId (server-side) or get from client-side session
    const resolvedUserId = userId || await getCurrentUserId();
    if (!resolvedUserId) {
        console.error('User not authenticated');
        return null;
    }

    // Use provided client (service role for server-side) or default client-side one
    const db = client || supabase;

    try {
        const { key, hash, prefix } = generateApiKey();

        const insertData: DbApiKeyInsert = {
            user_id: resolvedUserId,
            name,
            key_hash: hash,
            key_prefix: prefix,
            is_active: true,
        };

        const { data, error } = await db
            .from('api_keys')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('Error creating API key:', error);
            return null;
        }

        return { key, apiKey: data };
    } catch (error) {
        console.error('Error creating API key:', error);
        return null;
    }
}

/**
 * List all API keys for a user
 * @param userId Optional - user ID for server-side calls (from API route auth)
 * @param client Optional - Supabase client (use service role client for server-side to bypass RLS)
 */
export async function listApiKeys(userId?: string, client?: SupabaseClient): Promise<ApiKeyListItem[]> {
    if (!isSupabaseConfigured()) {
        return [];
    }

    // Use provided userId (server-side) or get from client-side session
    const resolvedUserId = userId || await getCurrentUserId();
    if (!resolvedUserId) {
        return [];
    }

    // Use provided client (service role for server-side) or default client-side one
    const db = client || supabase;

    try {
        const { data, error } = await db
            .from('api_keys')
            .select('id, name, key_prefix, is_active, created_at, last_used_at')
            .eq('user_id', resolvedUserId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error listing API keys:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error listing API keys:', error);
        return [];
    }
}

/**
 * Revoke an API key (soft delete)
 * @param keyId The key ID to revoke
 * @param userId Optional - user ID for server-side calls (from API route auth)
 * @param client Optional - Supabase client (use service role client for server-side to bypass RLS)
 */
export async function revokeApiKey(keyId: string, userId?: string, client?: SupabaseClient): Promise<boolean> {
    if (!isSupabaseConfigured()) {
        return false;
    }

    // Use provided userId (server-side) or get from client-side session
    const resolvedUserId = userId || await getCurrentUserId();
    if (!resolvedUserId) {
        return false;
    }

    // Use provided client (service role for server-side) or default client-side one
    const db = client || supabase;

    try {
        const { error } = await db
            .from('api_keys')
            .update({ is_active: false })
            .eq('id', keyId)
            .eq('user_id', resolvedUserId); // Ensure ownership

        if (error) {
            console.error('Error revoking API key:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error revoking API key:', error);
        return false;
    }
}

/**
 * Validate an API key (Server-side only)
 * REQUIRES a Service Role client to bypass RLS
 */
export async function validateApiKey(
    supabaseServiceDetail: SupabaseClient, 
    key: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
    try {
        const prefix = key.substring(0, 10);
        
        // Find keys with this prefix
        const { data: keys, error } = await supabaseServiceDetail
            .from('api_keys')
            .select('user_id, key_hash')
            .eq('key_prefix', prefix)
            .eq('is_active', true);

        if (error || !keys || keys.length === 0) {
            return { valid: false, error: 'Invalid API key' };
        }

        // Import here to avoid circular dependencies if any
        const { verifyApiKey } = await import('../auth/apiKeyAuth');

        // Verify hash (should only be one match due to random probability, but we handle multiple)
        for (const apiKey of keys) {
            if (verifyApiKey(key, apiKey.key_hash)) {
                // Update usage stats (fire and forget)
                await supabaseServiceDetail
                    .from('api_keys')
                    .update({ last_used_at: new Date().toISOString() })
                    .eq('key_hash', apiKey.key_hash); // Use hash to ID row since we didn't select ID

                return { valid: true, userId: apiKey.user_id };
            }
        }

        return { valid: false, error: 'Invalid API key' };
    } catch (error) {
        console.error('Error validating API key:', error);
        return { valid: false, error: 'Validation failed' };
    }
}
