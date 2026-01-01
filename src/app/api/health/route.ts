import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { createServiceRoleClient } from '@/lib/supabaseServer';
import { isBlobConfigured } from '@/lib/blob';

export const dynamic = 'force-dynamic';

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    services: {
        redis: ServiceStatus;
        database: ServiceStatus;
        blob: ServiceStatus;
    };
    version?: string;
}

interface ServiceStatus {
    status: 'up' | 'down' | 'unknown';
    latencyMs?: number;
    message?: string;
}

/**
 * GET /api/health
 * 
 * Returns system health status including Redis and database connectivity.
 * Useful for monitoring and deployment checks.
 */
export async function GET() {
    const health: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            redis: { status: 'unknown' },
            database: { status: 'unknown' },
            blob: { status: 'unknown' },
        },
        version: process.env.npm_package_version || '1.0.0',
    };

    // Check Redis
    try {
        const redis = getRedis();
        if (redis) {
            const start = Date.now();
            await redis.ping();
            health.services.redis = {
                status: 'up',
                latencyMs: Date.now() - start,
            };
        } else {
            health.services.redis = {
                status: 'down',
                message: 'Redis not configured',
            };
        }
    } catch (error) {
        health.services.redis = {
            status: 'down',
            message: error instanceof Error ? error.message : 'Connection failed',
        };
    }

    // Check Database
    try {
        const supabase = createServiceRoleClient();
        const start = Date.now();
        const { error } = await supabase.from('templates').select('id').limit(1);
        
        if (error) {
            health.services.database = {
                status: 'down',
                message: error.message,
            };
        } else {
            health.services.database = {
                status: 'up',
                latencyMs: Date.now() - start,
            };
        }
    } catch (error) {
        health.services.database = {
            status: 'down',
            message: error instanceof Error ? error.message : 'Connection failed',
        };
    }

    // Check Blob
    if (isBlobConfigured()) {
        health.services.blob = {
            status: 'up',
            message: 'Vercel Blob configured',
        };
    } else {
        health.services.blob = {
            status: 'down',
            message: 'BLOB_READ_WRITE_TOKEN not set',
        };
    }

    // Determine overall status
    const allUp = Object.values(health.services).every(s => s.status === 'up');
    const allDown = Object.values(health.services).every(s => s.status === 'down');
    
    if (allDown) {
        health.status = 'unhealthy';
    } else if (!allUp) {
        health.status = 'degraded';
    }

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
}
