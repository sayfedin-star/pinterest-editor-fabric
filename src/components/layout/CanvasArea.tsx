'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useEditorStore } from '@/stores/editorStore';
import { Hand } from 'lucide-react';
import { EmptyCanvasState } from '@/components/canvas/EmptyCanvasState';
import { ZoomControls } from '@/components/canvas/ZoomControls';

// EditorCanvas is now the v2 architecture (renamed from EditorCanvas.v2)
const EditorCanvas = dynamic(
    () => import('@/components/canvas/EditorCanvas'),
    { ssr: false, loading: () => <CanvasLoading /> }
);

function CanvasLoading() {
    return (
        <div className="flex-1 bg-gray-200 flex items-center justify-center">
            <div className="text-gray-500">Loading canvas...</div>
        </div>
    );
}

export function CanvasArea() {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const hasAutoFitted = useRef(false);

    // Pan mode state
    const [isPanMode, setIsPanMode] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });

    const canvasSize = useEditorStore((s) => s.canvasSize);
    const zoom = useEditorStore((s) => s.zoom);
    const setZoom = useEditorStore((s) => s.setZoom);
    const elements = useEditorStore((s) => s.elements);
    const addText = useEditorStore((s) => s.addText);
    const addImage = useEditorStore((s) => s.addImage);

    // Spacebar hold for pan mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if typing in input/textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
                return;
            }
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                setIsPanMode(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsPanMode(false);
                setIsPanning(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Pan mouse handlers
    const handlePanMouseDown = useCallback((e: React.MouseEvent) => {
        if (isPanMode && scrollRef.current) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
            setScrollStart({
                x: scrollRef.current.scrollLeft,
                y: scrollRef.current.scrollTop
            });
        }
    }, [isPanMode]);

    const handlePanMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning && scrollRef.current) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            scrollRef.current.scrollLeft = scrollStart.x - dx;
            scrollRef.current.scrollTop = scrollStart.y - dy;
        }
    }, [isPanning, panStart, scrollStart]);

    const handlePanMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    // Calculate auto-fit zoom
    const calculateFitZoom = useCallback((viewportWidth: number, viewportHeight: number) => {
        const padding = 100; // Reduced padding since no rulers
        const availableWidth = viewportWidth - padding;
        const availableHeight = viewportHeight - padding;

        const scaleX = availableWidth / canvasSize.width;
        const scaleY = availableHeight / canvasSize.height;
        const fitZoom = Math.min(scaleX, scaleY);

        return Math.min(1, Math.max(0.1, fitZoom));
    }, [canvasSize.width, canvasSize.height]);

    // Update dimensions and auto-fit on mount
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({ width: rect.width, height: rect.height });
                return rect;
            }
            return null;
        };

        const rect = updateDimensions();

        if (rect && !hasAutoFitted.current) {
            const fitZoom = calculateFitZoom(rect.width, rect.height);
            setZoom(fitZoom);
            hasAutoFitted.current = true;
        }

        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [calculateFitZoom, setZoom]);

    // Center the canvas on initial load
    useEffect(() => {
        if (scrollRef.current && dimensions.width > 0 && dimensions.height > 0) {
            const timer = setTimeout(() => {
                if (scrollRef.current) {
                    const CANVAS_PADDING = 100;
                    const canvasWidth = canvasSize.width * zoom;
                    const canvasHeight = canvasSize.height * zoom;
                    const totalWidth = canvasWidth + CANVAS_PADDING * 2;
                    const totalHeight = canvasHeight + CANVAS_PADDING * 2;
                    
                    // Center explicitly
                    const scrollLeft = Math.max(0, (totalWidth - dimensions.width) / 2);
                    const scrollTop = Math.max(0, (totalHeight - dimensions.height) / 2);

                    scrollRef.current.scrollLeft = scrollLeft;
                    scrollRef.current.scrollTop = scrollTop;
                }
            }, 100);

            return () => clearTimeout(timer);
        }
        return undefined;
    }, [dimensions, canvasSize, zoom]);

    const getCursorStyle = () => {
        if (isPanning) return 'grabbing';
        if (isPanMode) return 'grab';
        return 'default';
    };

    return (
        <div className="flex-1 bg-gray-100 relative overflow-hidden flex flex-col" ref={containerRef}>
            
            {/* Main Canvas Container */}
            <div className="flex-1 relative">
                {/* Empty Canvas State */}
                {elements.length === 0 && (
                    <EmptyCanvasState
                        onAddText={addText}
                        onAddImage={addImage}
                    />
                )}
                
                {/* Canvas Scroll Container */}
                <div
                    ref={scrollRef}
                    className="absolute inset-0 overflow-auto bg-gray-200"
                    style={{ cursor: getCursorStyle() }}
                    onMouseDown={handlePanMouseDown}
                    onMouseMove={handlePanMouseMove}
                    onMouseUp={handlePanMouseUp}
                    onMouseLeave={handlePanMouseUp}
                >
                    {dimensions.width > 0 && (
                        <EditorCanvas
                            containerWidth={dimensions.width}
                            containerHeight={dimensions.height}
                        />
                    )}
                </div>
            </div>
            
            {/* Zoom and Undo/Redo Controls (Bottom Right) */}
            <ZoomControls />
            
            {/* Pan Mode Indicator (Bottom Right) */}
            {isPanMode && (
                 <div className="absolute bottom-16 right-4 z-50 bg-blue-600 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <Hand className="w-3 h-3" />
                    Pan Mode Active
                </div>
            )}
        </div>
    );
}
