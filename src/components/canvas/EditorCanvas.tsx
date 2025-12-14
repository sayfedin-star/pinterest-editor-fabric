'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as fabric from 'fabric';
import { useEditorStore } from '@/stores/editorStore';
import { useShallow } from 'zustand/react/shallow';
import { useFabricRefStore } from '@/hooks/useStageRef';
import { ContextMenu } from './ContextMenu';
import { renderTemplate } from '@/lib/fabric/engine';
import { AlignmentGuides } from '@/lib/fabric/AlignmentGuides'; // ✅ NEW
import { TextElement, DEFAULT_DUMMY_DATA, Element } from '@/types/editor';

interface EditorCanvasProps {
    containerWidth: number;
    containerHeight: number;
}

const CANVAS_PADDING = 100;

function getElementId(obj: fabric.FabricObject): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (obj as any).elementId || (obj as any).data?.id;
}

export function EditorCanvas({ containerWidth, containerHeight }: EditorCanvasProps) {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const guidesRef = useRef<AlignmentGuides | null>(null); // ✅ NEW

    // Mutable refs to break dependency loops
    const elementsRef = useRef<Element[]>([]);
    const editingTextRef = useRef<string>("");
    const editingIdRef = useRef<string | null>(null);
    const selectedIdsRef = useRef<string[]>([]);

    const renderVersionRef = useRef(0);
    const isUpdatingFromFabric = useRef(false);
    const [isCanvasReady, setIsCanvasReady] = useState(false);

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; isOpen: boolean }>({ x: 0, y: 0, isOpen: false });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState<string>("");
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const setFabricRef = useFabricRefStore((s) => s.setFabricRef);

    const {
        elements, selectedIds, selectElement, updateElement, pushHistory,
        zoom, setZoom, backgroundColor, canvasSize, previewMode,
    } = useEditorStore(useShallow((s) => ({
        elements: s.elements,
        selectedIds: s.selectedIds,
        selectElement: s.selectElement,
        updateElement: s.updateElement,
        pushHistory: s.pushHistory,
        zoom: s.zoom,
        setZoom: s.setZoom,
        backgroundColor: s.backgroundColor,
        canvasSize: s.canvasSize,
        previewMode: s.previewMode,
    })));

    // Sync Refs
    useEffect(() => { elementsRef.current = elements; }, [elements]);
    useEffect(() => { editingTextRef.current = editingText; }, [editingText]);
    useEffect(() => { editingIdRef.current = editingId; }, [editingId]);
    useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

    const handleTextSubmit = useCallback(() => {
        if (editingId && editingText !== undefined) {
            updateElement(editingId, { text: editingText });
            pushHistory();
        }
        setEditingId(null);
    }, [editingId, editingText, updateElement, pushHistory]);

    const initCanvas = useCallback(async () => {
        if (!canvasElRef.current) return;
        if (fabricCanvasRef.current) {
            fabricCanvasRef.current.dispose();
        }
        await new Promise(resolve => setTimeout(resolve, 50));

        const canvas = new fabric.Canvas(canvasElRef.current, {
            width: canvasSize.width,
            height: canvasSize.height,
            selection: true,
            preserveObjectStacking: true,
            backgroundColor: backgroundColor,
            controlsAboveOverlay: true,
        });

        fabricCanvasRef.current = canvas;
        setFabricRef(fabricCanvasRef);
        setIsCanvasReady(true);

        // ✅ NEW: Initialize Smart Guides
        guidesRef.current = new AlignmentGuides(canvas);

        // --- Event Listeners ---

        canvas.on('selection:created', (e) => {
            if (isUpdatingFromFabric.current) return;
            const id = e.selected?.[0] ? getElementId(e.selected[0]) : null;
            if (id) selectElement(id);
        });

        canvas.on('selection:updated', (e) => {
            if (isUpdatingFromFabric.current) return;
            const id = e.selected?.[0] ? getElementId(e.selected[0]) : null;
            if (id) selectElement(id);
        });

        canvas.on('selection:cleared', () => {
            if (isUpdatingFromFabric.current) return;
            selectElement(null);
        });

        // ✅ FIX: "Snap-Back" & Geometry Handler
        canvas.on('object:modified', (e) => {
            const obj = e.target;
            if (!obj) return;
            const id = getElementId(obj);
            if (!id) return;

            isUpdatingFromFabric.current = true;

            const scaleX = obj.scaleX || 1;
            const scaleY = obj.scaleY || 1;
            const currentWidth = obj.width || 0;
            const currentHeight = obj.height || 0;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatePayload: any = {
                x: obj.left || 0,
                y: obj.top || 0,
                rotation: obj.angle || 0,
            };

            // Specialized handling for Text vs. Image
            if (obj instanceof fabric.Textbox) {
                const currentFontSize = obj.fontSize || 16;
                // Calculate new properties
                const newFontSize = Math.round(currentFontSize * scaleY);
                const newWidth = Math.round(currentWidth * scaleX);

                updatePayload.fontSize = newFontSize;
                updatePayload.width = newWidth;

                // ✅ CRITICAL: Apply to Visual Object Immediately
                obj.set({ fontSize: newFontSize, width: newWidth, scaleX: 1, scaleY: 1 });
            } else {
                const newWidth = Math.round(currentWidth * scaleX);
                const newHeight = Math.round(currentHeight * scaleY);

                updatePayload.width = newWidth;
                updatePayload.height = newHeight;

                // ✅ CRITICAL: Apply to Visual Object Immediately
                obj.set({ width: newWidth, height: newHeight, scaleX: 1, scaleY: 1 });
            }

            obj.setCoords(); // Refresh handles
            updateElement(id, updatePayload);
            pushHistory();
            setTimeout(() => { isUpdatingFromFabric.current = false; }, 50);
        });

        canvas.on('mouse:dblclick', (e) => {
            const obj = e.target;
            const id = obj ? getElementId(obj) : null;
            const el = elementsRef.current.find(e => e.id === id);
            if (el && el.type === 'text' && !el.locked) {
                setEditingId(el.id);
                setEditingText((el as TextElement).text);
                setTimeout(() => textAreaRef.current?.focus(), 50);
            }
        });

        canvas.on('mouse:down', (e) => {
            const evt = e.e as MouseEvent;
            if (evt.button === 2) {
                evt.preventDefault();
                setContextMenu({ x: evt.clientX, y: evt.clientY, isOpen: true });
            } else {
                setContextMenu(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
            }
            if (editingIdRef.current) {
                const el = elementsRef.current.find(e => e.id === editingIdRef.current);
                if (el && el.type === 'text') {
                    updateElement(editingIdRef.current, { text: editingTextRef.current });
                    pushHistory();
                }
                setEditingId(null);
            }
        });

        // ✅ FIX: Safe Zoom Handler
        canvas.on('mouse:wheel', (opt) => {
            if (opt.e.ctrlKey || opt.e.metaKey) {
                opt.e.preventDefault();
                opt.e.stopPropagation();
                const delta = opt.e.deltaY;
                const scaleBy = 1.1;
                const dir = delta > 0 ? -1 : 1;

                const currentZoom = useEditorStore.getState().zoom;
                const newZoom = dir > 0 ? currentZoom * scaleBy : currentZoom / scaleBy;

                // Pass Number, not Function
                setZoom(Math.max(0.1, Math.min(3, newZoom)));
            }
        });

    }, [canvasSize, backgroundColor, selectElement, updateElement, pushHistory, setFabricRef, setZoom]);

    // Init
    useEffect(() => {
        initCanvas();
        return () => {
            guidesRef.current?.dispose(); // ✅ NEW
            fabricCanvasRef.current?.dispose();
            setIsCanvasReady(false);
        };
    }, [initCanvas]);

    // Render Loop (Atomic & Debounced)
    useEffect(() => {
        if (!fabricCanvasRef.current || !isCanvasReady || isUpdatingFromFabric.current) return;

        const currentVersion = ++renderVersionRef.current;
        const timeoutId = setTimeout(async () => {
            if (renderVersionRef.current !== currentVersion || !fabricCanvasRef.current) return;

            try {
                await renderTemplate(
                    fabricCanvasRef.current,
                    elements,
                    { width: canvasSize.width, height: canvasSize.height, backgroundColor, interactive: true },
                    previewMode ? (DEFAULT_DUMMY_DATA as unknown as Record<string, string>) : {},
                    {}
                );

                if (renderVersionRef.current !== currentVersion) return;

                // Restore Selection
                const currentSelectedIds = selectedIdsRef.current;
                if (currentSelectedIds.length > 0) {
                    const objs = fabricCanvasRef.current.getObjects();
                    const active = objs.find(o => getElementId(o) === currentSelectedIds[0]);
                    if (active) fabricCanvasRef.current.setActiveObject(active);
                }
                fabricCanvasRef.current.requestRenderAll();

            } catch (error) { console.error("Render failed:", error); }
        }, 16);

        return () => clearTimeout(timeoutId);
    }, [elements, backgroundColor, canvasSize, isCanvasReady, previewMode]); // NO selectedIds!

    // Selection Sync (Separate)
    useEffect(() => {
        if (!fabricCanvasRef.current || !isCanvasReady) return;
        const canvas = fabricCanvasRef.current;

        if (selectedIds.length === 0) {
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            return;
        }

        const activeObject = canvas.getActiveObject();
        const activeId = activeObject ? getElementId(activeObject) : null;

        if (activeId !== selectedIds[0]) {
            const objs = canvas.getObjects();
            const target = objs.find(o => getElementId(o) === selectedIds[0]);
            if (target) {
                isUpdatingFromFabric.current = true;
                canvas.setActiveObject(target);
                canvas.requestRenderAll();
                setTimeout(() => { isUpdatingFromFabric.current = false; }, 50);
            }
        }
    }, [selectedIds, isCanvasReady]);

    // Zoom Sync
    useEffect(() => {
        if (fabricCanvasRef.current && isCanvasReady) {
            fabricCanvasRef.current.setZoom(zoom);
            fabricCanvasRef.current.setDimensions({ width: canvasSize.width * zoom, height: canvasSize.height * zoom });
            fabricCanvasRef.current.requestRenderAll();
        }
    }, [zoom, canvasSize, isCanvasReady]);

    return (
        <div className="flex items-start justify-start relative"
            style={{ minWidth: (canvasSize.width * zoom) + CANVAS_PADDING * 2, minHeight: (canvasSize.height * zoom) + CANVAS_PADDING * 2, padding: 0 }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#e5e7eb' }} />
            <div style={{
                position: 'relative', marginLeft: CANVAS_PADDING, marginTop: CANVAS_PADDING,
                width: canvasSize.width * zoom, height: canvasSize.height * zoom,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
                <canvas ref={canvasElRef} />
            </div>
            {editingId && (
                <textarea
                    ref={textAreaRef}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={() => {
                        if (editingId) {
                            updateElement(editingId, { text: editingText });
                            pushHistory();
                        }
                        setEditingId(null);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); } if (e.key === 'Escape') setEditingId(null); }}
                    style={{
                        position: 'absolute',
                        left: CANVAS_PADDING + ((elements.find(e => e.id === editingId)?.x || 0) * zoom),
                        top: CANVAS_PADDING + ((elements.find(e => e.id === editingId)?.y || 0) * zoom),
                        width: (elements.find(e => e.id === editingId)?.width || 100) * zoom,
                        minHeight: (elements.find(e => e.id === editingId)?.height || 50) * zoom,
                        fontSize: ((elements.find(e => e.id === editingId) as TextElement)?.fontSize || 16) * zoom,
                        fontFamily: (elements.find(e => e.id === editingId) as TextElement)?.fontFamily,
                        color: (elements.find(e => e.id === editingId) as TextElement)?.fill,
                        textAlign: (elements.find(e => e.id === editingId) as TextElement)?.align as React.CSSProperties['textAlign'],
                        lineHeight: (elements.find(e => e.id === editingId) as TextElement)?.lineHeight || 1.2,
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '2px dashed #0076D3',
                        zIndex: 1000, resize: 'none', outline: 'none', overflow: 'hidden',
                        transform: `rotate(${(elements.find(e => e.id === editingId)?.rotation || 0)}deg)`,
                        transformOrigin: 'top left'
                    }}
                    autoFocus
                />
            )}
            <ContextMenu x={contextMenu.x} y={contextMenu.y} isOpen={contextMenu.isOpen} onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))} />
        </div>
    );
}
