'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { Element, CanvasSize } from '@/types/editor';
import { renderTemplate, FieldMapping } from '@/lib/fabric/engine';

interface FabricPreviewProps {
    elements: Element[];
    canvasSize: CanvasSize;
    backgroundColor: string;
    rowData?: Record<string, string>;
    fieldMapping?: FieldMapping;
    scale?: number;
    className?: string;
}

/**
 * FabricPreview Component
 * 
 * A React component for previewing templates using the shared Fabric.js engine.
 * This ensures visual consistency with server-side rendering.
 */
export function FabricPreview({
    elements,
    canvasSize,
    backgroundColor,
    rowData = {},
    fieldMapping = {},
    scale = 0.2,
    className
}: FabricPreviewProps) {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

    const initCanvas = useCallback(async () => {
        if (!canvasElRef.current) return;

        // Dispose old instance if exists
        if (fabricCanvasRef.current) {
            fabricCanvasRef.current.dispose();
            fabricCanvasRef.current = null;
        }

        // Initialize Fabric Canvas
        const canvas = new fabric.Canvas(canvasElRef.current, {
            width: canvasSize.width,
            height: canvasSize.height,
            enableRetinaScaling: true,
            selection: false, // Preview mode is read-only
            interactive: false // Preview mode is read-only
        });

        fabricCanvasRef.current = canvas;

        // Render Template using shared engine
        await renderTemplate(
            canvas,
            elements,
            {
                width: canvasSize.width,
                height: canvasSize.height,
                backgroundColor
            },
            rowData,
            fieldMapping
        );

    }, [elements, canvasSize, backgroundColor, rowData, fieldMapping]);

    useEffect(() => {
        initCanvas();

        // Cleanup to prevent memory leaks
        return () => {
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
                fabricCanvasRef.current = null;
            }
        };
    }, [initCanvas]);

    // CSS scaling to fit container while maintaining resolution
    return (
        <div
            className={className}
            style={{
                width: canvasSize.width * scale,
                height: canvasSize.height * scale,
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            <canvas
                ref={canvasElRef}
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left'
                }}
            />
        </div>
    );
}

export default FabricPreview;
