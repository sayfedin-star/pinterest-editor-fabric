import { Redis } from '@upstash/redis';

/**
 * Upstash Redis Client
 * 
 * Uses environment variables from Vercel:
 * - KV_REST_API_URL
 * - KV_REST_API_TOKEN
 * 
 * For local development, add these to .env.local
 * If credentials are missing, caching is skipped gracefully.
 */

// Singleton pattern - create once, reuse everywhere
let redis: Redis | null = null;
let redisAvailable: boolean | null = null;

export function getRedis(): Redis | null {
    // Only check once
    if (redisAvailable === false) return null;
    
    if (!redis) {
        const url = process.env.KV_REST_API_URL;
        const token = process.env.KV_REST_API_TOKEN;
        
        if (!url || !token) {
            console.log('[Redis] Credentials not found - caching disabled');
            redisAvailable = false;
            return null;
        }
        
        redis = new Redis({
            url,
            token,
        });
        redisAvailable = true;
    }
    
    return redis;
}

// =============================================================================
// CACHE UTILITIES
// =============================================================================

/**
 * Cache wrapper with TTL (Time To Live)
 * If Redis is not available, just calls the fallback directly.
 * 
 * @example
 * const fonts = await cacheGet('fonts:all', async () => {
 *     return await db.query('SELECT * FROM fonts');
 * }, 3600); // Cache for 1 hour
 */
export async function cacheGet<T>(
    key: string,
    fallback: () => Promise<T>,
    ttlSeconds: number = 300 // Default 5 minutes
): Promise<T> {
    const redis = getRedis();
    
    // No Redis? Just call fallback directly
    if (!redis) {
        return fallback();
    }
    
    try {
        // Try cache first
        const cached = await redis.get<T>(key);
        if (cached !== null) {
            console.log(`[Cache] HIT: ${key}`);
            return cached;
        }
        
        // Cache miss - get fresh data
        console.log(`[Cache] MISS: ${key}`);
        const fresh = await fallback();
        
        // Store in cache with TTL
        await redis.setex(key, ttlSeconds, fresh);
        
        return fresh;
    } catch (error) {
        console.error(`[Cache] Error for ${key}:`, error);
        // Fallback to fresh data on error
        return fallback();
    }
}

/**
 * Invalidate a cache key or pattern
 */
export async function cacheInvalidate(key: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    
    await redis.del(key);
    console.log(`[Cache] Invalidated: ${key}`);
}

/**
 * Invalidate multiple keys matching a pattern
 * 
 * @example
 * await cacheInvalidatePattern('fonts:*'); // Clear all font caches
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`[Cache] Invalidated ${keys.length} keys matching: ${pattern}`);
    }
}

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * Simple rate limiter using sliding window
 * Returns true if allowed, false if rate limit exceeded.
 * If Redis is unavailable, always returns true (no rate limiting).
 * 
 * @example
 * const allowed = await checkRateLimit('generate:user123', 10, 60); // 10 per minute
 * if (!allowed) throw new Error('Rate limit exceeded');
 */
export async function checkRateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return true; // No rate limiting if Redis unavailable
    
    const now = Date.now();
    const windowKey = `ratelimit:${key}`;
    
    // Remove old entries and count current window
    await redis.zremrangebyscore(windowKey, 0, now - (windowSeconds * 1000));
    const count = await redis.zcard(windowKey);
    
    if (count >= maxRequests) {
        console.log(`[RateLimit] Exceeded: ${key} (${count}/${maxRequests})`);
        return false;
    }
    
    // Add current request
    await redis.zadd(windowKey, { score: now, member: `${now}` });
    await redis.expire(windowKey, windowSeconds);
    
    return true;
}

// =============================================================================
// CAMPAIGN PROGRESS TRACKING
// =============================================================================

export interface CampaignProgress {
    campaignId: string;
    total: number;
    completed: number;
    failed: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    startedAt?: string;
    completedAt?: string;
    errors?: string[];
}

/**
 * Set campaign generation progress
 * 
 * @example
 * await setProgress('campaign-123', { completed: 50, total: 100, status: 'processing' });
 */
export async function setProgress(
    campaignId: string,
    progress: Partial<CampaignProgress>
): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    
    try {
        const key = `progress:${campaignId}`;
        const current = await redis.get<CampaignProgress>(key) || {
            campaignId,
            total: 0,
            completed: 0,
            failed: 0,
            status: 'pending' as const,
        };
        
        const updated: CampaignProgress = {
            ...current,
            ...progress,
            campaignId, // Always preserve campaignId
        };
        
        // Auto-set timestamps
        if (progress.status === 'processing' && !updated.startedAt) {
            updated.startedAt = new Date().toISOString();
        }
        if (progress.status === 'completed' || progress.status === 'failed') {
            updated.completedAt = new Date().toISOString();
        }
        
        // Store with 24-hour TTL
        await redis.setex(key, 86400, updated);
    } catch (error) {
        console.error(`[Progress] Failed to set progress for ${campaignId}:`, error);
    }
}

/**
 * Get campaign generation progress
 * 
 * @example
 * const progress = await getProgress('campaign-123');
 * console.log(`${progress.completed}/${progress.total} pins generated`);
 */
export async function getProgress(campaignId: string): Promise<CampaignProgress | null> {
    const redis = getRedis();
    if (!redis) return null;
    
    return redis.get<CampaignProgress>(`progress:${campaignId}`);
}

/**
 * Increment completed count
 * 
 * NOTE: This uses get-then-set which has a race condition under high concurrency.
 * For most use cases (batch processing with controlled parallelism), this is acceptable.
 * The 5-min lock TTL provides a safety net for stuck jobs.
 */
export async function incrementProgress(
    campaignId: string,
    field: 'completed' | 'failed',
    amount: number = 1
): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    
    try {
        const key = `progress:${campaignId}`;
        const current = await redis.get<CampaignProgress>(key);
        
        if (current) {
            current[field] = (current[field] || 0) + amount;
            
            // Auto-complete if all done
            if (current.completed + current.failed >= current.total) {
                current.status = current.failed > 0 ? 'failed' : 'completed';
                current.completedAt = new Date().toISOString();
            }
            
            await redis.setex(key, 86400, current);
        }
    } catch (error) {
        // Log but don't throw - progress tracking is non-critical
        console.error(`[Progress] Failed to increment ${field} for ${campaignId}:`, error);
    }
}

/**
 * Clear campaign progress (after completion or cleanup)
 */
export async function clearProgress(campaignId: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    
    await redis.del(`progress:${campaignId}`);
}

// =============================================================================
// JOB DEDUPLICATION (Distributed Locks)
// =============================================================================

/**
 * Acquire a distributed lock for a job
 * Prevents duplicate processing of the same job across workers
 * 
 * @example
 * const acquired = await acquireLock(`render:${campaignId}`, 300);
 * if (!acquired) {
 *     console.log('Job already running');
 *     return;
 * }
 * try {
 *     // Do work
 * } finally {
 *     await releaseLock(`render:${campaignId}`);
 * }
 */
export async function acquireLock(
    lockKey: string,
    ttlSeconds: number = 300 // Default 5 minutes
): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return true; // No Redis = no locking (allow all)
    
    try {
        const key = `lock:${lockKey}`;
        const value = `${Date.now()}:${Math.random()}`;
        
        // SET NX (only if not exists) with expiry
        const result = await redis.set(key, value, { nx: true, ex: ttlSeconds });
        
        return result === 'OK';
    } catch (error) {
        console.error(`[Lock] Failed to acquire lock ${lockKey}:`, error);
        return true; // Allow on error to prevent blocking
    }
}

/**
 * Release a distributed lock
 */
export async function releaseLock(lockKey: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    
    try {
        await redis.del(`lock:${lockKey}`);
    } catch (error) {
        console.error(`[Lock] Failed to release lock ${lockKey}:`, error);
    }
}

/**
 * Check if a lock is currently held
 */
export async function isLocked(lockKey: string): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;
    
    const exists = await redis.exists(`lock:${lockKey}`);
    return exists === 1;
}

/**
 * Check if a campaign is currently being rendered
 * Convenience wrapper for common use case
 */
export async function isCampaignRendering(campaignId: string): Promise<boolean> {
    return isLocked(`render:${campaignId}`);
}
