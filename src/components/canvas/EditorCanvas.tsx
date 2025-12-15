'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useSnappingSettingsStore } from '@/stores/snappingSettingsStore';
import { Element } from '@/types/editor';
import { CanvasManager, CanvasConfig } from '@/lib/canvas/CanvasManager';
import { useSynchronizationBridge } from '@/hooks/useSynchronizationBridge';
import { detectElementChange } from '@/lib/canvas/elementChangeDetection';
import { ContextMenu } from './ContextMenu';
import { DimensionBadge } from './DimensionBadge';
import { ElementToolbar } from './ElementToolbar';

interface EditorCanvasProps {
    containerWidth: number;
    containerHeight: number;
}

const CANVAS_PADDING = 100;

/**
 * EditorCanvas.v2 - New Architecture using CanvasManager
 * 
 * Key Differences from EditorCanvas.tsx:
 * - Uses CanvasManager instead of direct Fabric.js access
 * - State sync handled by SynchronizationBridge
 * - No renderTemplate() calls - elements managed imperatively
 * - Performance optimized with SpatialHashGrid
 */
export function EditorCanvasV2({ containerWidth, containerHeight }: EditorCanvasProps) {
    // Refs
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const canvasManagerRef = useRef<CanvasManager | null>(null);

    // Local state
    const [isCanvasReady, setIsCanvasReady] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; isOpen: boolean }>({
        x: 0,
        y: 0,
        isOpen: false
    });

    // Dimension badge state (during resize)
    const [dimensionBadge, setDimensionBadge] = useState<{
        visible: boolean;
        width: number;
        height: number;
        x: number;
        y: number;
    }>({ visible: false, width: 0, height: 0, x: 0, y: 0 });

    // Element toolbar state
    const [toolbarVisible, setToolbarVisible] = useState(false);

    // Zustand store
    const {
        canvasSize,
        backgroundColor,
        zoom,
        elements,
        selectedIds,
        duplicateElement,
        deleteElement,
        updateElement,
    } = useEditorStore();

    const selectedElement = elements.find(el => el.id === selectedIds[0]);

    // Initialize SynchronizationBridge
    useSynchronizationBridge(canvasManagerRef.current);

    /**
     * Initialize CanvasManager
     */
    useEffect(() => {
        if (!canvasElRef.current || canvasManagerRef.current) return;

        console.log('[EditorCanvas.v2] Initializing CanvasManager');

        const config: CanvasConfig = {
            width: canvasSize.width,
            height: canvasSize.height,
            backgroundColor: backgroundColor,
            zoom: zoom,
        };

        const manager = new CanvasManager();
        manager.initialize(canvasElRef.current, config);

        canvasManagerRef.current = manager;
        setIsCanvasReady(true);

        console.log('[EditorCanvas.v2] CanvasManager initialized');

        return () => {
            console.log('[EditorCanvas.v2] Cleaning up CanvasManager');
            manager.destroy();
            canvasManagerRef.current = null;
        };
    }, []); // Only run once on mount

    /**
     * Smart element sync using change detection
     * Only syncs when necessary to avoid interrupting interactions
     */
    const prevElementsRef = useRef<Element[]>([]);

    useEffect(() => {
        if (!canvasManagerRef.current || !isCanvasReady) return;

        const change = detectElementChange(prevElementsRef.current, elements);

        if (change.type === 'list') {
            console.log('[EditorCanvas.v2] List change, full sync');
            canvasManagerRef.current.replaceAllElements(elements);
        } else if (change.type === 'properties' && change.modified) {
            console.log('[EditorCanvas.v2] Property changes:', change.modified.length);
            for (const id of change.modified) {
                const element = elements.find(el => el.id === id);
                if (element) {
                    canvasManagerRef.current.updateElement(id, element);
                }
            }
        }

        prevElementsRef.current = elements;

    }, [elements, isCanvasReady]);

    /**
     * Subscribe to snapping settings changes
     */
    useEffect(() => {
        if (!canvasManagerRef.current) return;

        // Apply initial settings
        const initialSettings = useSnappingSettingsStore.getState();
        canvasManagerRef.current.updateSnappingSettings(initialSettings);

        // Subscribe to changes
        const unsubscribe = useSnappingSettingsStore.subscribe((state) => {
            if (canvasManagerRef.current) {
                canvasManagerRef.current.updateSnappingSettings(state);
            }
        });

        return () => unsubscribe();
    }, [isCanvasReady]);

    /**
     * Update canvas size when it changes
     */
    useEffect(() => {
        if (!canvasManagerRef.current || !isCanvasReady) return;

        console.log('[EditorCanvas.v2] Updating canvas size:', canvasSize);
        canvasManagerRef.current.setCanvasSize(canvasSize.width, canvasSize.height);
    }, [canvasSize, isCanvasReady]);

    /**
     * Update background color when it changes
     */
    useEffect(() => {
        if (!canvasManagerRef.current || !isCanvasReady) return;

        console.log('[EditorCanvas.v2] Updating background color:', backgroundColor);
        canvasManagerRef.current.setBackgroundColor(backgroundColor);
    }, [backgroundColor, isCanvasReady]);

    /**
     * Update zoom when it changes
     */
    useEffect(() => {
        if (!canvasManagerRef.current || !isCanvasReady) return;

        console.log('[EditorCanvas.v2] Updating zoom:', zoom);
        canvasManagerRef.current.setZoom(zoom);
    }, [zoom, isCanvasReady]);

    /**
     * Update toolbar visibility based on selection
     */
    useEffect(() => {
        setToolbarVisible(selectedIds.length > 0 && !!selectedElement);
    }, [selectedIds, selectedElement]);

    /**
     * Handle context menu
     */
    const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            isOpen: true,
        });
    };

    const handleCloseContextMenu = () => {
        setContextMenu(prev => ({ ...prev, isOpen: false }));
    };

    /**
     * Handle toolbar actions
     */
    const handleDuplicate = () => {
        if (selectedIds.length === 0) return;
        duplicateElement(selectedIds[0]);
    };

    const handleDelete = () => {
        if (selectedIds.length === 0) return;
        deleteElement(selectedIds[0]);
    };

    const handleToggleLock = () => {
        if (!selectedElement) return;
        updateElement(selectedElement.id, { locked: !selectedElement.locked });
    };

    // Calculate canvas container size
    const canvasWidth = canvasSize.width * zoom;
    const canvasHeight = canvasSize.height * zoom;
    const containerStyle = {
        width: containerWidth,
        height: containerHeight,
        overflow: 'auto' as const,
        position: 'relative' as const,
        backgroundColor: '#f5f5f5',
    };

    return (
        <div style={containerStyle} onContextMenu={handleContextMenu}>
            {/* Canvas Container */}
            <div
                style={{
                    width: canvasWidth + CANVAS_PADDING * 2,
                    height: canvasHeight + CANVAS_PADDING * 2,
                    padding: CANVAS_PADDING,
                    position: 'relative',
                }}
            >
                {/* Fabric.js Canvas */}
                <canvas ref={canvasElRef} />

                {/* Element Toolbar */}
                {toolbarVisible && selectedElement && (
                    <ElementToolbar
                        x={selectedElement.x}
                        y={selectedElement.y}
                        width={selectedElement.width}
                        visible={toolbarVisible}
                        zoom={zoom}
                        isLocked={selectedElement.locked || false}
                        onRotate={() => console.log('Rotate not implemented yet')}
                        onToggleLock={handleToggleLock}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                        onMore={() => console.log('More options not implemented yet')}
                    />
                )}

                {/* Dimension Badge (during resize) */}
                <DimensionBadge
                    width={dimensionBadge.width}
                    height={dimensionBadge.height}
                    x={dimensionBadge.x}
                    y={dimensionBadge.y}
                    visible={dimensionBadge.visible}
                    zoom={zoom}
                />
            </div>

            {/* Context Menu */}
            <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                isOpen={contextMenu.isOpen}
                onClose={handleCloseContextMenu}
            />
        </div>
    );
}

// Default export for dynamic import
export default EditorCanvasV2;
