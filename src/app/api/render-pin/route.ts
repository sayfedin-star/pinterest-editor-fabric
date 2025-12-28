import { NextRequest, NextResponse } from 'next/server';
import { StaticCanvas } from 'fabric/node';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Element } from '@/types/editor';
import { renderTemplateServer, RenderConfig, FieldMapping, prepareElementsForServerRendering } from '@/lib/fabric/serverEngine';

// Vercel Serverless Config
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

// Request body interface
interface RenderPinRequest {
    elements: Element[];
    canvasSize: { width: number; height: number };
    backgroundColor: string;
    rowData?: Record<string, string>;
    fieldMapping?: FieldMapping;
    multiplier?: number;
}

export async function POST(req: NextRequest) {
    try {
        const body: RenderPinRequest = await req.json();
        const {
            elements,
            canvasSize,
            backgroundColor,
            rowData = {},
            fieldMapping = {},
            multiplier = 1
        } = body;

        // Validate required fields
        if (!elements || !canvasSize) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: elements, canvasSize' },
                { status: 400 }
            );
        }

        // Initialize Supabase Client (Moved up for font loading)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Server configuration error: Missing Supabase credentials');
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false
            }
        });

        // Prepare elements (load fonts including custom Supabase fonts)
        const preparedElements = await prepareElementsForServerRendering(elements, supabaseUrl, supabaseKey);

        // Initialize Headless Canvas (StaticCanvas)
        const canvas = new StaticCanvas(undefined, {
            width: canvasSize.width,
            height: canvasSize.height
        });

        // Render using shared engine
        const config: RenderConfig = {
            width: canvasSize.width,
            height: canvasSize.height,
            backgroundColor
        };

        await renderTemplateServer(canvas, preparedElements, config, rowData, fieldMapping);

        // Export to data URL
        const dataUrl = canvas.toDataURL({
            format: 'png',
            multiplier
        });

        // Cleanup - dispose canvas
        canvas.dispose();

        // --- Upload to Supabase Storage ---

        // 1. Prepare Buffer
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        // 2. Upload File (Supabase client already initialized)
        const fileName = `${uuidv4()}.png`;
        const bucketName = 'generated_pins';

        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, buffer, {
                contentType: 'image/png',
                upsert: false
            });

        if (uploadError) {
            console.error('Supabase Upload Error:', uploadError);
            throw new Error(`Failed to upload generated image: ${uploadError.message}`);
        }

        // 4. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        return NextResponse.json({
            success: true,
            url: publicUrl
        });

    } catch (error: unknown) {
        console.error('Server Render Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}
