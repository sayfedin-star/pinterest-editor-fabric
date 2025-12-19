'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
import { ErrorBoundary } from 'react-error-boundary';
import { useCanvasStore } from '@/stores/canvasStore';
import { useElementsStore } from '@/stores/elementsStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useEditorStore } from '@/stores/editorStore';
import { useSnappingSettingsStore } from '@/stores/snappingSettingsStore';
import { Element, ImageElement, TextElement } from '@/types/editor';
import { CanvasManager, CanvasConfig } from '@/lib/canvas/CanvasManager';
import { useSynchronizationBridge } from '@/hooks/useSynchronizationBridge';
import { detectElementChange } from '@/lib/canvas/elementChangeDetection';
import { ContextMenu } from './ContextMenu';
import { DimensionBadge } from './DimensionBadge';
import { ElementToolbar } from './ElementToolbar';
import { RichTextEditor } from './RichTextEditor';

// ============================================
// Constants (Extracted from magic numbers)
// ============================================
const CANVAS_PADDING = 100;
const DEBOUNCE_DELAY = 16; // ~60fps
const GHOST_OPACITY = 0.5;
const NORMAL_OPACITY = 1;

// ============================================
// Types
// ============================================
interface EditorCanvasProps {
    containerWidth: number;
    containerHeight: number;
}

interface DimensionBadgeState {
    visible: boolean;
    width: number;
    height: number;
    x: number;
    y: number;
}

interface RichTextEditorState {
    isOpen: boolean;
    element: TextElement | null;
    position: { x: number; y: number };
}

// ============================================
// Error Fallback Component
// ============================================
function CanvasErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-red-50 border-2 border-red-200 rounded-lg">
            <h2 className="text-2xl font-bold text-red-700 mb-4">Canvas Error</h2>
            <p className="text-red-600 mb-4">{error.message}</p>
            <button
                onClick={resetErrorBoundary}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
                Reload Canvas
            </button>
        </div>
    );
}

// ============================================
// Main Component (wrapped in error boundary below)
// ============================================
function EditorCanvasInner({ containerWidth, containerHeight }: EditorCanvasProps) {
    // ==================== Refs ====================
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const canvasManagerRef = useRef<CanvasManager | null>(null);
    const activeObjectRef = useRef<any>(null);
    const prevElementsRef = useRef<Element[]>([]);

    // ==================== Local State ====================
    const [isCanvasReady, setIsCanvasReady] = useState(false);
    const [contextMenu, setContextMenu] = useState({ x: 0, y: 0, isOpen: false });
    const [dimensionBadge, setDimensionBadge] = useState<DimensionBadgeState>({
        visible: false,
        width: 0,
        height: 0,
        x: 0,
        y: 0
    });
    const [toolbarVisible, setToolbarVisible] = useState(false);
    const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [isResizing, setIsResizing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isEditingText, setIsEditingText] = useState(false);
    const [richTextEditorState, setRichTextEditorState] = useState<RichTextEditorState>({
        isOpen: false,
        element: null,
        position: { x: 0, y: 0 }
    });

    // ==================== Store Selectors ====================
    const canvasSize = useCanvasStore((s) => s.canvasSize);
    const backgroundColor = useCanvasStore((s) => s.backgroundColor);
    const zoom = useCanvasStore((s) => s.zoom);
    const elements = useElementsStore((s) => s.elements);
    const updateElement = useElementsStore((s) => s.updateElement);
    const deleteElement = useElementsStore((s) => s.deleteElement);
    const duplicateElement = useElementsStore((s) => s.duplicateElement);
    const selectedIds = useSelectionStore((s) => s.selectedIds);
    const selectedElement = elements.find(el => el.id === selectedIds[0]);

    // ==================== Synchronization Bridge ====================
    useSynchronizationBridge(canvasManagerRef.current);

    // ==================== Debounced Event Handlers ====================
    // FIX: Issue #5 - Add debouncing to prevent redundant renders
    const handleScalingDebounced = useMemo(
        () => debounce((e: fabric.IEvent<MouseEvent>) => {
            setIsResizing(true);
            const target = e.target || (e as any).transform?.target;
            if (target) {
                activeObjectRef.current = target;
                target.set({ opacity: GHOST_OPACITY });
                (canvasManagerRef.current as any).canvas?.requestRenderAll();
            }
        }, DEBOUNCE_DELAY),
        []
    );

    const handleMovingDebounced = useMemo(
        () => debounce((e: fabric.IEvent<MouseEvent>) => {
            setIsDragging(true);
            const target = e.target || (e as any).transform?.target;
            if (target && target.opacity !== GHOST_OPACITY) {
                target.set({ opacity: GHOST_OPACITY });
                (canvasManagerRef.current as any).canvas?.requestRenderAll();
            }
        }, DEBOUNCE_DELAY),
        []
    );

    const updateToolbarPositionDebounced = useMemo(
        () => debounce((e: fabric.IEvent<MouseEvent>) => {
            const obj = e.target;
            if (!obj) return;
            const rect = obj.getBoundingRect(true, true);
            const currentZoom = zoom || 1;
            setToolbarPosition({
                x: rect.left / currentZoom,
                y: rect.top / currentZoom,
                width: rect.width / currentZoom,
                height: rect.height / currentZoom
            });
        }, DEBOUNCE_DELAY),
        [zoom]
    );

    const updateBadgeDebounced = useMemo(
        () => debounce((e: fabric.IEvent<MouseEvent>) => {
            const obj = e.target;
            if (!obj) return;
            const rect = obj.getBoundingRect(true, true);
            const centerX = rect.left + rect.width / 2;
            const topY = rect.top;
            setDimensionBadge({
                visible: true,
                width: obj.getScaledWidth(),
                height: obj.getScaledHeight(),
                x: centerX,
                y: topY,
            });
        }, DEBOUNCE_DELAY),
        []
    );

    // ==================== Canvas Initialization ====================
    useEffect(() => {
        if (!canvasElRef.current || canvasManagerRef.current) return;

        try {
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

            // Register canvas with shared store for thumbnail generation
            const { useFabricRefStore } = require('@/hooks/useStageRef');
            const canvasRef = { current: (manager as any).canvas };
            useFabricRefStore.getState().setFabricRef(canvasRef);

            return () => {
                manager.destroy();
                canvasManagerRef.current = null;
                useFabricRefStore.getState().setFabricRef({ current: null });
            };
        } catch (error) {
            console.error('[EditorCanvas] Initialization failed:', error);
            throw error; // Let error boundary catch this
        }
    }, []); // Only run once on mount

    // ==================== Event Bindings with Cleanup ====================
    // Ghost effect events
    useEffect(() => {
        const manager = canvasManagerRef.current;
        if (!manager || !isCanvasReady) return;

        const handleOperationEnd = (e: fabric.IEvent<MouseEvent>) => {
            setIsResizing(false);
            setIsDragging(false);
            const target = e.target || (e as any).transform?.target;
            if (target) {
                target.set({ opacity: NORMAL_OPACITY });
                (manager as any).canvas?.requestRenderAll();
            }
        };

        const handleSelectionCleared = () => {
            setIsResizing(false);
            setIsDragging(false);
            activeObjectRef.current = null;
        };

        manager.on('object:scaling', handleScalingDebounced);
        manager.on('object:moving', handleMovingDebounced);
        manager.on('object:modified', handleOperationEnd);
        manager.on('selection:cleared', handleSelectionCleared);

        return () => {
            // Cleanup: Cancel debounced callbacks
            handleScalingDebounced.cancel();
            handleMovingDebounced.cancel();
            
            manager.off('object:scaling', handleScalingDebounced);
            manager.off('object:moving', handleMovingDebounced);
            manager.off('object:modified', handleOperationEnd);
            manager.off('selection:cleared', handleSelectionCleared);
        };
    }, [isCanvasReady, handleScalingDebounced, handleMovingDebounced]);

    // Dimension badge events
    useEffect(() => {
        if (!isCanvasReady || !canvasManagerRef.current) return;
        const manager = canvasManagerRef.current;

        const hideBadge = () => {
            setDimensionBadge(prev => ({ ...prev, visible: false }));
        };

        manager.on('object:scaling', updateBadgeDebounced);
        manager.on('object:resizing', updateBadgeDebounced);
        manager.on('object:modified', hideBadge);
        manager.on('selection:cleared', hideBadge);
        manager.on('selection:updated', hideBadge);

        return () => {
            updateBadgeDebounced.cancel();
            manager.off('object:scaling', updateBadgeDebounced);
            manager.off('object:resizing', updateBadgeDebounced);
            manager.off('object:modified', hideBadge);
            manager.off('selection:cleared', hideBadge);
            manager.off('selection:updated', hideBadge);
        };
    }, [isCanvasReady, updateBadgeDebounced]);

    // Text editing events
    useEffect(() => {
        if (!isCanvasReady || !canvasManagerRef.current) return;
        const manager = canvasManagerRef.current;

        const handleTextEditStart = () => setIsEditingText(true);
        const handleTextEditEnd = () => setIsEditingText(false);

        manager.on('text:editing:entered', handleTextEditStart);
        manager.on('text:editing:exited', handleTextEditEnd);

        return () => {
            manager.off('text:editing:entered', handleTextEditStart);
            manager.off('text:editing:exited', handleTextEditEnd);
        };
    }, [isCanvasReady]);

    // Rich text editor double-click
    useEffect(() => {
        if (!isCanvasReady || !canvasManagerRef.current) return;
        const manager = canvasManagerRef.current;

        const handleDblClick = (e: fabric.IEvent<MouseEvent>) => {
            const target = e.target;
            if (!target) return;

            const elementId = (target as any).id;
            const element = elements.find(el => el.id === elementId);

            if (element?.type === 'text' && (element as TextElement).richTextEnabled) {
                const rect = target.getBoundingRect(true, true);
                setRichTextEditorState({
                    isOpen: true,
                    element: element as TextElement,
                    position: { x: rect.left, y: rect.top + rect.height + 10 }
                });
            }
        };

        manager.on('mouse:dblclick', handleDblClick);
        return () => {
            manager.off('mouse:dblclick', handleDblClick);
        };
    }, [isCanvasReady, elements]);

    // Toolbar position tracking
    useEffect(() => {
        if (!isCanvasReady || !canvasManagerRef.current) return;
        const manager = canvasManagerRef.current;

        manager.on('object:moving', updateToolbarPositionDebounced);
        manager.on('object:scaling', updateToolbarPositionDebounced);
        manager.on('object:rotating', updateToolbarPositionDebounced);

        return () => {
            updateToolbarPositionDebounced.cancel();
            manager.off('object:moving', updateToolbarPositionDebounced);
            manager.off('object:scaling', updateToolbarPositionDebounced);
            manager.off('object:rotating', updateToolbarPositionDebounced);
        };
    }, [isCanvasReady, updateToolbarPositionDebounced]);

    // ==================== Element Sync ====================
    useEffect(() => {
        if (!canvasManagerRef.current || !isCanvasReady) return;

        const change = detectElementChange(prevElementsRef.current, elements);

        if (change.type === 'list') {
            canvasManagerRef.current.replaceAllElements(elements);
        } else if (change.type === 'properties' && change.modified) {
            let needsFullSync = false;
            
            for (const id of change.modified) {
                const prevEl = prevElementsRef.current.find(el => el.id === id);
                const currEl = elements.find(el => el.id === id);
                
                // Check for structure-changing updates
                if (prevEl?.type === 'image' && currEl?.type === 'image') {
                    if (prevEl.fitMode !== currEl.fitMode) {
                        needsFullSync = true;
                        break;
                    }
                }
                
                if (prevEl?.type === 'text' && currEl?.type === 'text') {
                    if (prevEl.previewText !== currEl.previewText || 
                        prevEl.isDynamic !== currEl.isDynamic ||
                        prevEl.backgroundEnabled !== currEl.backgroundEnabled) {
                        needsFullSync = true;
                        break;
                    }
                }
            }
            
            if (needsFullSync) {
                canvasManagerRef.current.replaceAllElements(elements);
            } else {
                for (const id of change.modified) {
                    const element = elements.find(el => el.id === id);
                    if (element) {
                        canvasManagerRef.current.updateElement(id, element);
                    }
                }
            }
        }

        prevElementsRef.current = elements;
    }, [elements, isCanvasReady]);

    // ==================== Canvas Configuration Updates ====================
    useEffect(() => {
        if (canvasManagerRef.current && isCanvasReady) {
            canvasManagerRef.current.setCanvasSize(canvasSize.width, canvasSize.height);
            canvasManagerRef.current.setZoom(zoom);
        }
    }, [canvasSize.width, canvasSize.height, zoom, isCanvasReady]);

    useEffect(() => {
        if (!canvasManagerRef.current || !isCanvasReady) return;
        canvasManagerRef.current.setBackgroundColor(backgroundColor);
    }, [backgroundColor, isCanvasReady]);

    // Snapping settings
    useEffect(() => {
        if (!canvasManagerRef.current || !isCanvasReady) return;

        canvasManagerRef.current.updateSnappingSettings(useSnappingSettingsStore.getState());

        const unsubscribe = useSnappingSettingsStore.subscribe((state) => {
            if (canvasManagerRef.current) {
                canvasManagerRef.current.updateSnappingSettings(state);
            }
        });

        return () => unsubscribe();
    }, [isCanvasReady]);

    // ==================== Toolbar Visibility ====================
    useEffect(() => {
        setToolbarVisible(selectedIds.length > 0 && !!selectedElement);
        if (selectedElement && canvasManagerRef.current) {
            setToolbarPosition({
                x: selectedElement.x,
                y: selectedElement.y,
                width: selectedElement.width,
                height: selectedElement.height
            });
        }
    }, [selectedIds, selectedElement]);

    // ==================== Event Handlers ====================
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const rect = canvasElRef.current?.getBoundingClientRect();
        if (rect) {
            setContextMenu({
                x: e.clientX,
                y: e.clientY,
                isOpen: true
            });
        }
    }, []);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleCloseRichTextEditor = useCallback(() => {
        setRichTextEditorState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleDuplicate = useCallback(() => {
        if (selectedIds.length === 0) return;
        duplicateElement(selectedIds[0]);
    }, [selectedIds, duplicateElement]);

    const handleDelete = useCallback(() => {
        if (selectedIds.length === 0) return;
        deleteElement(selectedIds[0]);
    }, [selectedIds, deleteElement]);

    const handleToggleLock = useCallback(() => {
        if (!selectedElement) return;
        updateElement(selectedElement.id, { locked: !selectedElement.locked });
    }, [selectedElement, updateElement]);

    const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const isBackgroundClick = 
            e.target === e.currentTarget || 
            target.dataset?.canvasBackground === 'true';
        
        if (isBackgroundClick) {
            useSelectionStore.getState().clearSelection();
            setToolbarVisible(false);
            if (canvasManagerRef.current?.isInitialized()) {
                const canvas = canvasManagerRef.current as any;
                if (canvas.canvas) {
                    canvas.canvas.discardActiveObject();
                    canvas.canvas.requestRenderAll();
                }
            }
        }
    }, []);

    // ==================== Layout Calculations ====================
    const canvasWidth = canvasSize.width * zoom;
    const canvasHeight = canvasSize.height * zoom;

    // ==================== Render ====================
    return (
        <div
            onClick={handleBackgroundClick}
            onContextMenu={handleContextMenu}
            className="editor-canvas-scroll-container"
            data-testid="editor-canvas"
            data-canvas-background="true"
            style={{
                position: 'relative',
                minWidth: '100%',
                minHeight: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: `${CANVAS_PADDING}px`,
            }}
        >
            {/* Canvas Container */}
            <div
                style={{
                    position: 'relative',
                    width: `${canvasWidth}px`,
                    height: `${canvasHeight}px`,
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                }}
            >
                {/* Fabric.js Canvas */}
                <canvas
                    ref={canvasElRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: `${canvasWidth}px`,
                        height: `${canvasHeight}px`,
                    }}
                />

                {/* Element Toolbar */}
                {toolbarVisible && selectedElement && !isDragging && !isResizing && (
                    <ElementToolbar
                        x={toolbarPosition.x}
                        y={toolbarPosition.y}
                        width={toolbarPosition.width}
                        height={toolbarPosition.height}
                        visible={true}
                        zoom={zoom}
                        isLocked={!!selectedElement.locked}
                        elementName={selectedElement.name || 'Untitled'}
                        elementId={selectedElement.id}
                        elementType={selectedElement.type as 'image' | 'text' | 'shape'}
                        isDynamic={
                            selectedElement.type === 'image' 
                                ? !!(selectedElement as ImageElement).isDynamic 
                                : selectedElement.type === 'text' 
                                    ? !!(selectedElement as TextElement).isDynamic 
                                    : false
                        }
                        dynamicFieldName={
                            selectedElement.type === 'image' 
                                ? (selectedElement as ImageElement).dynamicSource 
                                : selectedElement.type === 'text' 
                                    ? (selectedElement as TextElement).dynamicField 
                                    : undefined
                        }
                        elements={elements}
                        onDelete={() => {
                            if (selectedElement && !selectedElement.locked) {
                                deleteElement(selectedElement.id);
                            }
                        }}
                        onDuplicate={() => {
                            duplicateElement(selectedElement.id);
                        }}
                        onToggleLock={() => {
                            updateElement(selectedElement.id, { locked: !selectedElement.locked });
                        }}
                        onRename={(newName) => {
                            updateElement(selectedElement.id, { name: newName });
                        }}
                        onDynamicChange={(fieldName, isDynamic) => {
                            if (selectedElement.type === 'image') {
                                updateElement(selectedElement.id, { 
                                    isDynamic, 
                                    dynamicSource: isDynamic ? fieldName : undefined 
                                });
                            } else if (selectedElement.type === 'text') {
                                const textEl = selectedElement as TextElement;
                                let newText = textEl.text;
                                if (isDynamic) {
                                    newText = `{{${fieldName}}}`;
                                } else {
                                    const templateMatch = textEl.text.match(/^\{\{(.+)\}\}$/);
                                    newText = templateMatch ? templateMatch[1] : textEl.text;
                                }
                                updateElement(selectedElement.id, { 
                                    isDynamic, 
                                    dynamicField: isDynamic ? fieldName : undefined,
                                    text: newText
                                });
                            }
                        }}
                        onMore={() => {
                            console.log('More options clicked');
                        }}
                    />
                )}

                {/* Dimension Badge */}
                <DimensionBadge
                    width={dimensionBadge.width}
                    height={dimensionBadge.height}
                    x={dimensionBadge.x}
                    y={dimensionBadge.y}
                    visible={dimensionBadge.visible}
                    zoom={zoom}
                />

                {/* Text Editing Indicator */}
                {isEditingText && (
                    <div className="absolute top-0 left-0 w-full bg-blue-500 text-white text-xs px-2 py-1 flex justify-between items-center z-50 opacity-90">
                        <span>Editing Text...</span>
                        <span className="text-[10px] opacity-80">Press ESC to finish</span>
                    </div>
                )}
            </div>

            {/* Rich Text Editor Modal */}
            {richTextEditorState.isOpen && richTextEditorState.element && (
                <RichTextEditor
                    element={richTextEditorState.element}
                    isOpen={richTextEditorState.isOpen}
                    position={richTextEditorState.position}
                    zoom={zoom}
                    onClose={handleCloseRichTextEditor}
                    onUpdate={(updates) => updateElement(richTextEditorState.element!.id, updates)}
                />
            )}
        </div>
    );
}

// ============================================
// Wrapped Export with Error Boundary
// ============================================
export function EditorCanvasV2(props: EditorCanvasProps) {
    return (
        <ErrorBoundary
            FallbackComponent={CanvasErrorFallback}
            onError={(error, info) => {
                console.error('[EditorCanvas] Error caught by boundary:', error, info);
                // TODO: Send to error tracking service (Sentry, etc.)
            }}
            onReset={() => {
                // Reset any state if needed
                useSelectionStore.getState().clearSelection();
            }}
        >
            <EditorCanvasInner {...props} />
        </ErrorBoundary>
    );
}

export default EditorCanvasV2;
