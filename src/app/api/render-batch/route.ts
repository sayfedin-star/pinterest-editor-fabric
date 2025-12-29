import { NextRequest, NextResponse } from 'next/server';
import { inngest } from "@/inngest/client";
import { createServiceRoleClient } from "@/lib/supabaseServer";
import { Element } from '@/types/editor';

// Vercel Serverless Config
export const maxDuration = 10; // Fast response
export const dynamic = 'force-dynamic';

interface RenderBatchRequest {
    campaignId: string;
    elements: Element[];
    canvasSize: { width: number; height: number };
    backgroundColor: string;
    fieldMapping?: Record<string, string>;
    csvRows: Record<string, string>[];
    startIndex?: number;
}

export async function POST(req: NextRequest) {
    try {
        const body: RenderBatchRequest = await req.json();
        const {
            campaignId,
            elements,
            canvasSize,
            backgroundColor,
            fieldMapping = {},
            csvRows,
            startIndex = 0,
        } = body;

        // Validation
        if (!campaignId || !elements || !canvasSize || !csvRows || csvRows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        console.log(`[API] Received batch render request for campaign ${campaignId} (${csvRows.length} rows)`);

        // 1. Update Campaign Status to 'processing'
        const supabase = createServiceRoleClient();
        const { error: updateError } = await supabase
            .from('campaigns')
            .update({ 
                status: 'processing',
                paused_at: null // Clear any pause state
            })
            .eq('id', campaignId);

        if (updateError) {
            console.error('[API] Failed to update campaign status:', updateError);
            return NextResponse.json(
                { success: false, error: 'Failed to update campaign status' },
                { status: 500 }
            );
        }

        // 2. Send Event to Inngest
        await inngest.send({
            name: "campaign/render.requested",
            data: {
                campaignId,
                elements,
                canvasSize,
                backgroundColor,
                fieldMapping,
                csvRows,
                startIndex
            },
        });

        // 3. Return Immediate Success
        return NextResponse.json({
            success: true,
            message: "Batch rendering started in background",
            count: csvRows.length
        });

    } catch (error: unknown) {
        console.error('[API] Error starting batch render:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}