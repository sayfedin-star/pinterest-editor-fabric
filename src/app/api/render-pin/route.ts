import { NextRequest, NextResponse } from 'next/server';
import * as fabric from 'fabric';
import { Element } from '@/types/editor';
import { renderTemplate, RenderConfig, FieldMapping } from '@/lib/fabric/engine';

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

        // Note: Font registration with registerFont from 'canvas' package
        // is only needed when canvas package is installed for Node.js rendering.
        // For now, we'll rely on system fonts or skip registration.
        // 
        // When canvas package is available:
        // import { registerFont } from 'canvas';
        // import path from 'path';
        // const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf');
        // registerFont(fontPath, { family: 'Roboto' });

        // Initialize Headless Canvas (StaticCanvas)
        // fabric.StaticCanvas works in Node without JSDOM for basic rendering
        const canvas = new fabric.StaticCanvas(undefined, {
            width: canvasSize.width,
            height: canvasSize.height
        });

        // Render using shared engine
        const config: RenderConfig = {
            width: canvasSize.width,
            height: canvasSize.height,
            backgroundColor
        };

        await renderTemplate(canvas, elements, config, rowData, fieldMapping);

        // Export to data URL
        const dataUrl = canvas.toDataURL({
            format: 'png',
            multiplier
        });

        // Cleanup - dispose canvas
        canvas.dispose();

        // In production, you would upload this to S3 and return that URL
        // For now, return the data URL directly
        return NextResponse.json({
            success: true,
            url: dataUrl
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
