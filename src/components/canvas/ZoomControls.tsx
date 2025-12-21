'use client';

import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Undo2, Redo2 } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { SnappingToolbarButton } from '@/components/editor/SnappingToolbarButton';

const ZOOM_LEVELS = [0.1, 0.15, 0.2, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * Floating footer controls - Undo/Redo, Snapping, and Zoom
 */
export function ZoomControls() {
    // All zoom state from editorStore
    const zoom = useEditorStore((s) => s.zoom);
    const setZoom = useEditorStore((s) => s.setZoom);
    const zoomToFit = useEditorStore((s) => s.zoomToFit);

    // History
    const canUndo = useEditorStore((s) => s.canUndo());
    const canRedo = useEditorStore((s) => s.canRedo());
    const undo = useEditorStore((s) => s.undo);
    const redo = useEditorStore((s) => s.redo);

    const handleZoomIn = () => {
        const idx = ZOOM_LEVELS.findIndex((z) => z >= zoom);
        if (idx < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[idx + 1]);
    };

    const handleZoomOut = () => {
        const idx = ZOOM_LEVELS.findIndex((z) => z >= zoom);
        if (idx > 0) setZoom(ZOOM_LEVELS[idx - 1]);
    };

    const handleFitToScreen = () => {
        const viewportWidth = window.innerWidth - 600;
        const viewportHeight = window.innerHeight - 200;
        zoomToFit(viewportWidth, viewportHeight);
    };

    return (
        <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1 px-2 py-1.5 bg-white rounded-lg shadow-lg border border-gray-200">
            {/* Undo */}
            <button
                onClick={undo}
                disabled={!canUndo}
                title="Undo"
                className={cn(
                    "flex items-center justify-center gap-1 h-7 px-2 rounded-md text-xs font-medium",
                    "hover:bg-gray-100 active:scale-95 transition-all duration-150",
                    canUndo ? "text-gray-600 hover:text-gray-800" : "text-gray-300 cursor-not-allowed"
                )}
            >
                <Undo2 className="w-4 h-4" />
                <span className="hidden sm:inline">Undo</span>
            </button>

            {/* Redo */}
            <button
                onClick={redo}
                disabled={!canRedo}
                title="Redo"
                className={cn(
                    "flex items-center justify-center gap-1 h-7 px-2 rounded-md text-xs font-medium",
                    "hover:bg-gray-100 active:scale-95 transition-all duration-150",
                    canRedo ? "text-gray-600 hover:text-gray-800" : "text-gray-300 cursor-not-allowed"
                )}
            >
                <Redo2 className="w-4 h-4" />
                <span className="hidden sm:inline">Redo</span>
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 mx-0.5" />

            {/* Snapping */}
            <SnappingToolbarButton />

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 mx-0.5" />

            {/* Zoom Out */}
            <button
                onClick={handleZoomOut}
                title="Zoom Out"
                className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-md",
                    "hover:bg-gray-100 active:scale-95 transition-all duration-150",
                    "text-gray-600 hover:text-gray-800"
                )}
            >
                <ZoomOut className="w-4 h-4" />
            </button>

            {/* Zoom Level Dropdown */}
            <select
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="h-7 w-[65px] px-1 border border-gray-200 rounded-md text-xs font-medium bg-white hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all cursor-pointer"
            >
                {ZOOM_LEVELS.map((level) => (
                    <option key={level} value={level}>{Math.round(level * 100)}%</option>
                ))}
            </select>

            {/* Zoom In */}
            <button
                onClick={handleZoomIn}
                title="Zoom In"
                className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-md",
                    "hover:bg-gray-100 active:scale-95 transition-all duration-150",
                    "text-gray-600 hover:text-gray-800"
                )}
            >
                <ZoomIn className="w-4 h-4" />
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 mx-0.5" />

            {/* Fit to Screen */}
            <button
                onClick={handleFitToScreen}
                title="Fit to Screen"
                className={cn(
                    "flex items-center justify-center gap-1.5 h-7 px-2 rounded-md",
                    "hover:bg-gray-100 active:scale-95 transition-all duration-150",
                    "text-gray-600 hover:text-gray-800 text-xs font-medium"
                )}
            >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Fit</span>
            </button>
        </div>
    );
}
