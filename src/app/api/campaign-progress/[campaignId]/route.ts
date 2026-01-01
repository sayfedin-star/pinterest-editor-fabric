import { NextRequest, NextResponse } from 'next/server';
import { getProgress } from '@/lib/redis';

export const dynamic = 'force-dynamic';

/**
 * GET /api/campaign-progress/[campaignId]
 * 
 * Returns real-time progress for a campaign generation job.
 * Used for polling from the frontend to show live progress.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ campaignId: string }> }
) {
    try {
        const { campaignId } = await params;
        
        if (!campaignId) {
            return NextResponse.json(
                { error: 'Campaign ID required' },
                { status: 400 }
            );
        }
        
        const progress = await getProgress(campaignId);
        
        if (!progress) {
            // No progress in Redis - might be using DB-only tracking
            return NextResponse.json({
                campaignId,
                total: 0,
                completed: 0,
                failed: 0,
                status: 'unknown',
                message: 'No real-time progress available'
            });
        }
        
        return NextResponse.json(progress);
        
    } catch (error) {
        console.error('[Progress API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to get progress' },
            { status: 500 }
        );
    }
}
