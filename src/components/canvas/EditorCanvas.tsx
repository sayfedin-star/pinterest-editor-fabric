'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as fabric from 'fabric';
import { useEditorStore } from '@/stores/editorStore';
import { useShallow } from 'zustand/react/shallow';
import { useFabricRefStore } from '@/hooks/useStageRef';
import { ContextMenu } from './ContextMenu';
import { renderTemplate, RenderConfig } from '@/lib/fabric/engine';
import {
    Element,
    TextElement,
    ImageElement,
    ShapeElement,
    Guide,
    DEFAULT_DUMMY_DATA,
} from '@/types/editor';

interface EditorCanvasProps {
    containerWidth: number;
    containerHeight: number;
}

const SNAP_THRESHOLD = 5;
const CANVAS_PADDING = 100;

// Map Fabric object to store element ID
function getElementId(obj: fabric.FabricObject): string | undefined {
    return (obj as fabric.FabricObject & { elementId?: string }).elementId;
}

function setElementId(obj: fabric.FabricObject, id: string) {
    (obj as fabric.FabricObject & { elementId?: string }).elementId = id;
}

export function EditorCanvas({ containerWidth, containerHeight }: EditorCanvasProps) {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const isUpdatingFromFabric = useRef(false); // Prevent re-render loops
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; isOpen: boolean }>({ x: 0, y: 0, isOpen: false });

    // Register fabric ref for thumbnail generation (used by Header)
    const setFabricRef = useFabricRefStore((s) => s.setFabricRef);

    // On-canvas text editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    // Smart guides state
    const [guides, setLocalGuides] = useState<Guide[]>([]);

    // Store state
    const {
        elements,
        selectedIds,
        selectElement,
        toggleSelection,
        updateElement,
        pushHistory,
        zoom,
        setZoom,
        backgroundColor,
        setGuides,
        clearGuides,
        snapToGrid,
        gridSize,
        canvasSize,
        previewMode,
    } = useEditorStore(
        useShallow((s) => ({
            elements: s.elements,
            selectedIds: s.selectedIds,
            selectElement: s.selectElement,
            toggleSelection: s.toggleSelection,
            updateElement: s.updateElement,
            pushHistory: s.pushHistory,
            zoom: s.zoom,
            setZoom: s.setZoom,
            backgroundColor: s.backgroundColor,
            setGuides: s.setGuides,
            clearGuides: s.clearGuides,
            snapToGrid: s.snapToGrid,
            gridSize: s.gridSize,
            canvasSize: s.canvasSize,
            previewMode: s.previewMode,
        }))
    );

    const canvasWidth = canvasSize.width;
    const canvasHeight = canvasSize.height;
    const scaledCanvasWidth = canvasWidth * zoom;
    const scaledCanvasHeight = canvasHeight * zoom;
    const stageWidth = scaledCanvasWidth + CANVAS_PADDING * 2;
    const stageHeight = scaledCanvasHeight + CANVAS_PADDING * 2;

    // ============================================
    // Smart Guides Calculation
    // ============================================
    const calculateGuides = useCallback((movingObj: fabric.FabricObject): Guide[] => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return [];

        const newGuides: Guide[] = [];
        const otherObjects = canvas.getObjects().filter(o => o !== movingObj && o.selectable);

        const movingBounds = movingObj.getBoundingRect();
        const movingEdges = {
            left: movingBounds.left,
            right: movingBounds.left + movingBounds.width,
            centerX: movingBounds.left + movingBounds.width / 2,
            top: movingBounds.top,
            bottom: movingBounds.top + movingBounds.height,
            centerY: movingBounds.top + movingBounds.height / 2,
        };

        // Canvas boundary guides
        const canvasEdges = {
            vertical: [
                { value: 0, label: 'Left' },
                { value: canvasWidth, label: 'Right' },
                { value: canvasWidth / 2, label: 'Center' },
            ],
            horizontal: [
                { value: 0, label: 'Top' },
                { value: canvasHeight, label: 'Bottom' },
                { value: canvasHeight / 2, label: 'Center' },
            ],
        };

        // Check vertical canvas edges
        canvasEdges.vertical.forEach(edge => {
            if (Math.abs(movingEdges.left - edge.value) < SNAP_THRESHOLD ||
                Math.abs(movingEdges.right - edge.value) < SNAP_THRESHOLD ||
                Math.abs(movingEdges.centerX - edge.value) < SNAP_THRESHOLD) {
                newGuides.push({
                    type: 'vertical',
                    position: edge.value,
                    points: [edge.value, 0, edge.value, canvasHeight],
                    guideType: 'alignment',
                    metadata: { label: edge.label },
                });
            }
        });

        // Check horizontal canvas edges
        canvasEdges.horizontal.forEach(edge => {
            if (Math.abs(movingEdges.top - edge.value) < SNAP_THRESHOLD ||
                Math.abs(movingEdges.bottom - edge.value) < SNAP_THRESHOLD ||
                Math.abs(movingEdges.centerY - edge.value) < SNAP_THRESHOLD) {
                newGuides.push({
                    type: 'horizontal',
                    position: edge.value,
                    points: [0, edge.value, canvasWidth, edge.value],
                    guideType: 'alignment',
                    metadata: { label: edge.label },
                });
            }
        });

        // Element-to-element guides
        otherObjects.forEach(obj => {
            const bounds = obj.getBoundingRect();
            const elEdges = {
                left: bounds.left,
                right: bounds.left + bounds.width,
                centerX: bounds.left + bounds.width / 2,
                top: bounds.top,
                bottom: bounds.top + bounds.height,
                centerY: bounds.top + bounds.height / 2,
            };

            // Vertical alignment
            ['left', 'right', 'centerX'].forEach((edge) => {
                const movingVal = movingEdges[edge as keyof typeof movingEdges];
                const elVal = elEdges[edge as keyof typeof elEdges];
                if (Math.abs(movingVal - elVal) < SNAP_THRESHOLD) {
                    newGuides.push({
                        type: 'vertical',
                        position: elVal,
                        points: [elVal, 0, elVal, canvasHeight],
                        guideType: 'snap',
                    });
                }
            });

            // Horizontal alignment
            ['top', 'bottom', 'centerY'].forEach((edge) => {
                const movingVal = movingEdges[edge as keyof typeof movingEdges];
                const elVal = elEdges[edge as keyof typeof elEdges];
                if (Math.abs(movingVal - elVal) < SNAP_THRESHOLD) {
                    newGuides.push({
                        type: 'horizontal',
                        position: elVal,
                        points: [0, elVal, canvasWidth, elVal],
                        guideType: 'snap',
                    });
                }
            });
        });

        return newGuides;
    }, [canvasWidth, canvasHeight]);

    // ============================================
    // Render Smart Guides as Fabric Lines
    // ============================================
    const renderGuidesOverlay = useCallback((newGuides: Guide[]) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        // Remove existing guide lines
        const existingGuides = canvas.getObjects().filter(o =>
            (o as fabric.FabricObject & { isGuide?: boolean }).isGuide
        );
        existingGuides.forEach(g => canvas.remove(g));

        // Add new guide lines
        newGuides.forEach(guide => {
            const color = guide.guideType === 'spacing' ? '#10B981' :
                guide.guideType === 'alignment' ? '#8B5CF6' :
                    guide.guideType === 'distance' ? '#3B82F6' : '#FF6B9D';

            const line = new fabric.Line(guide.points as [number, number, number, number], {
                stroke: color,
                strokeWidth: 1,
                strokeDashArray: [4, 4],
                selectable: false,
                evented: false,
                opacity: 0.8,
            });
            (line as fabric.FabricObject & { isGuide?: boolean }).isGuide = true;
            canvas.add(line);
            canvas.bringObjectToFront(line);
        });

        setLocalGuides(newGuides);
    }, []);

    const clearGuidesOverlay = useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const existingGuides = canvas.getObjects().filter(o =>
            (o as fabric.FabricObject & { isGuide?: boolean }).isGuide
        );
        existingGuides.forEach(g => canvas.remove(g));
        setLocalGuides([]);
    }, []);

    // ============================================
    // Initialize Fabric Canvas
    // ============================================
    const initCanvas = useCallback(async () => {
        if (!canvasElRef.current) return;

        // Dispose old canvas
        if (fabricCanvasRef.current) {
            fabricCanvasRef.current.dispose();
        }

        const canvas = new fabric.Canvas(canvasElRef.current, {
            width: canvasWidth,
            height: canvasHeight,
            selection: true,
            preserveObjectStacking: true,
            backgroundColor: backgroundColor,
            controlsAboveOverlay: true,
        });

        fabricCanvasRef.current = canvas;

        // Configure selection styling
        fabric.FabricObject.prototype.set({
            borderColor: '#0076D3',
            cornerColor: '#0076D3',
            cornerStyle: 'circle',
            cornerSize: 8,
            transparentCorners: false,
            borderScaleFactor: 1.5,
        });

        // ============================================
        // Event Handlers
        // ============================================

        // Selection events
        canvas.on('selection:created', (e) => {
            if (isUpdatingFromFabric.current) return;
            const selected = e.selected;
            if (selected && selected.length > 0) {
                const id = getElementId(selected[0]);
                if (id) {
                    selectElement(id);
                }
            }
        });

        canvas.on('selection:updated', (e) => {
            if (isUpdatingFromFabric.current) return;
            const selected = e.selected;
            if (selected && selected.length > 0) {
                const id = getElementId(selected[0]);
                if (id) {
                    selectElement(id);
                }
            }
        });

        canvas.on('selection:cleared', () => {
            if (isUpdatingFromFabric.current) return;
            selectElement(null);
        });

        // Object moving - show guides and snap
        canvas.on('object:moving', (e) => {
            const obj = e.target;
            if (!obj) return;

            const newGuides = calculateGuides(obj);
            renderGuidesOverlay(newGuides);

            // Snap to guides
            newGuides.forEach(guide => {
                const bounds = obj.getBoundingRect();
                if (guide.type === 'vertical') {
                    const centerX = bounds.left + bounds.width / 2;
                    const left = bounds.left;
                    const right = bounds.left + bounds.width;

                    if (Math.abs(centerX - guide.position) < SNAP_THRESHOLD) {
                        obj.set({ left: (obj.left || 0) + (guide.position - centerX) });
                    } else if (Math.abs(left - guide.position) < SNAP_THRESHOLD) {
                        obj.set({ left: (obj.left || 0) + (guide.position - left) });
                    } else if (Math.abs(right - guide.position) < SNAP_THRESHOLD) {
                        obj.set({ left: (obj.left || 0) + (guide.position - right) });
                    }
                } else {
                    const centerY = bounds.top + bounds.height / 2;
                    const top = bounds.top;
                    const bottom = bounds.top + bounds.height;

                    if (Math.abs(centerY - guide.position) < SNAP_THRESHOLD) {
                        obj.set({ top: (obj.top || 0) + (guide.position - centerY) });
                    } else if (Math.abs(top - guide.position) < SNAP_THRESHOLD) {
                        obj.set({ top: (obj.top || 0) + (guide.position - top) });
                    } else if (Math.abs(bottom - guide.position) < SNAP_THRESHOLD) {
                        obj.set({ top: (obj.top || 0) + (guide.position - bottom) });
                    }
                }
            });

            // Grid snapping (if no guide snapping)
            if (snapToGrid && newGuides.length === 0) {
                obj.set({
                    left: Math.round((obj.left || 0) / gridSize) * gridSize,
                    top: Math.round((obj.top || 0) / gridSize) * gridSize,
                });
            }
        });

        // Object modified - sync to store (CRUCIAL: avoid re-render loop)
        canvas.on('object:modified', (e) => {
            const obj = e.target;
            if (!obj) return;

            const elementId = getElementId(obj);
            if (!elementId) return;

            clearGuidesOverlay();

            // Set flag to prevent re-render
            isUpdatingFromFabric.current = true;

            const scaleX = obj.scaleX || 1;
            const scaleY = obj.scaleY || 1;

            updateElement(elementId, {
                x: obj.left || 0,
                y: obj.top || 0,
                width: Math.max(20, (obj.width || 100) * scaleX),
                height: Math.max(20, (obj.height || 100) * scaleY),
                rotation: obj.angle || 0,
            });

            // Reset scale (we've applied it to width/height)
            obj.set({ scaleX: 1, scaleY: 1 });
            obj.setCoords();

            pushHistory();

            // Reset flag after state update
            setTimeout(() => {
                isUpdatingFromFabric.current = false;
            }, 50);
        });

        // Mouse up - clear guides
        canvas.on('mouse:up', () => {
            clearGuidesOverlay();
        });

        // Double-click for text editing
        canvas.on('mouse:dblclick', (e) => {
            const obj = e.target;
            if (!obj) return;

            const elementId = getElementId(obj);
            if (!elementId) return;

            const element = elements.find(el => el.id === elementId);
            if (element && element.type === 'text' && !element.locked) {
                setEditingId(element.id);
                setTimeout(() => textAreaRef.current?.focus(), 0);
            }
        });

        // Context menu
        canvas.on('mouse:down', (e) => {
            const evt = e.e as MouseEvent;
            if (evt.button === 2) { // Right click
                evt.preventDefault();
                setContextMenu({
                    x: evt.clientX,
                    y: evt.clientY,
                    isOpen: true,
                });
            } else if (contextMenu.isOpen) {
                setContextMenu(prev => ({ ...prev, isOpen: false }));
            }
            if (editingId) {
                setEditingId(null);
            }
        });

        // Wheel zoom
        canvas.on('mouse:wheel', (opt) => {
            if (opt.e.ctrlKey || opt.e.metaKey) {
                opt.e.preventDefault();
                opt.e.stopPropagation();
                const delta = opt.e.deltaY;
                const scaleBy = 1.1;
                const direction = delta > 0 ? -1 : 1;
                const newZoom = direction > 0 ? zoom * scaleBy : zoom / scaleBy;
                setZoom(Math.max(0.25, Math.min(2, newZoom)));
            }
        });

        return canvas;
    }, [canvasWidth, canvasHeight, backgroundColor, selectElement, updateElement,
        pushHistory, calculateGuides, renderGuidesOverlay, clearGuidesOverlay,
        snapToGrid, gridSize, zoom, setZoom, elements, editingId, contextMenu.isOpen]);

    // ============================================
    // Render Elements to Canvas
    // ============================================
    const renderElements = useCallback(async () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || isUpdatingFromFabric.current) return;

        // Store current selection
        const activeObject = canvas.getActiveObject();
        const selectedId = activeObject ? getElementId(activeObject) : null;

        // Clear canvas
        canvas.clear();
        canvas.backgroundColor = backgroundColor;

        // Sort elements by zIndex
        const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

        // Render each element
        for (const element of sortedElements) {
            if (!element.visible) continue;

            let fabricObject: fabric.FabricObject | null = null;

            if (element.type === 'text') {
                const textEl = element as TextElement;

                // Get display text
                let displayText = textEl.text;
                if (textEl.isDynamic && textEl.dynamicField && previewMode) {
                    const dummyData = DEFAULT_DUMMY_DATA as unknown as Record<string, string>;
                    displayText = dummyData[textEl.dynamicField] || `[${textEl.dynamicField}]`;
                } else if (textEl.isDynamic && textEl.dynamicField && !previewMode) {
                    displayText = `{{${textEl.dynamicField}}}`;
                }

                // Create text object
                const textObj = new fabric.Textbox(displayText, {
                    left: textEl.x,
                    top: textEl.y,
                    width: textEl.width,
                    height: textEl.height,
                    fontSize: textEl.fontSize,
                    fontFamily: textEl.fontFamily,
                    fontStyle: textEl.fontStyle === 'italic' ? 'italic' : 'normal',
                    fontWeight: textEl.fontStyle === 'bold' ? 'bold' : 'normal',
                    fill: textEl.fill,
                    textAlign: textEl.align || 'center',
                    lineHeight: textEl.lineHeight || 1.2,
                    charSpacing: (textEl.letterSpacing || 0) * 10,
                    opacity: textEl.opacity,
                    angle: textEl.rotation || 0,
                    selectable: !textEl.locked,
                    evented: !textEl.locked,
                    lockMovementX: textEl.locked,
                    lockMovementY: textEl.locked,
                    lockRotation: textEl.locked,
                    lockScalingX: textEl.locked,
                    lockScalingY: textEl.locked,
                });

                // Add shadow if enabled
                if (textEl.shadowColor && textEl.shadowBlur) {
                    textObj.set({
                        shadow: new fabric.Shadow({
                            color: textEl.shadowColor,
                            blur: textEl.shadowBlur,
                            offsetX: textEl.shadowOffsetX || 0,
                            offsetY: textEl.shadowOffsetY || 0,
                        }),
                    });
                }

                // Add stroke if enabled
                if (textEl.stroke && textEl.strokeWidth) {
                    textObj.set({
                        stroke: textEl.stroke,
                        strokeWidth: textEl.strokeWidth,
                    });
                }

                // Background box for text
                if (textEl.backgroundEnabled) {
                    const group = new fabric.Group([
                        new fabric.Rect({
                            width: textEl.width,
                            height: textEl.height,
                            fill: textEl.backgroundColor || '#FFFFFF',
                            rx: textEl.backgroundCornerRadius || 8,
                            ry: textEl.backgroundCornerRadius || 8,
                        }),
                        textObj,
                    ], {
                        left: textEl.x,
                        top: textEl.y,
                        angle: textEl.rotation || 0,
                        opacity: textEl.opacity,
                        selectable: !textEl.locked,
                        evented: !textEl.locked,
                    });
                    setElementId(group, element.id);
                    canvas.add(group);
                    continue;
                }

                fabricObject = textObj;
            }

            else if (element.type === 'image') {
                const imageEl = element as ImageElement;

                // Get display URL
                let displayUrl = imageEl.imageUrl;

                // Proxy Canva backgrounds
                if (imageEl.isCanvaBackground && displayUrl) {
                    displayUrl = `/api/proxy-image?url=${encodeURIComponent(displayUrl)}`;
                }

                // Dynamic image in preview mode
                if (imageEl.isDynamic && imageEl.dynamicSource && previewMode) {
                    displayUrl = imageEl.dynamicSource === 'logo'
                        ? DEFAULT_DUMMY_DATA.logo
                        : DEFAULT_DUMMY_DATA.image;
                }

                if (displayUrl) {
                    try {
                        const img = await fabric.FabricImage.fromURL(displayUrl, {
                            crossOrigin: 'anonymous',
                        });
                        img.set({
                            left: imageEl.x,
                            top: imageEl.y,
                            scaleX: imageEl.width / (img.width || 1),
                            scaleY: imageEl.height / (img.height || 1),
                            angle: imageEl.rotation || 0,
                            opacity: imageEl.opacity,
                            selectable: !imageEl.locked,
                            evented: !imageEl.locked,
                        });

                        // Corner radius via clipPath
                        if (imageEl.cornerRadius && imageEl.cornerRadius > 0) {
                            const clipRect = new fabric.Rect({
                                width: img.width || imageEl.width,
                                height: img.height || imageEl.height,
                                rx: imageEl.cornerRadius,
                                ry: imageEl.cornerRadius,
                                originX: 'center',
                                originY: 'center',
                            });
                            img.set({ clipPath: clipRect });
                        }

                        fabricObject = img;
                    } catch (error) {
                        console.warn('[EditorCanvas] Failed to load image:', displayUrl, error);
                        // Create placeholder
                        const placeholder = new fabric.Rect({
                            left: imageEl.x,
                            top: imageEl.y,
                            width: imageEl.width,
                            height: imageEl.height,
                            fill: '#F3F4F6',
                            stroke: '#D1D5DB',
                            strokeWidth: 2,
                            strokeDashArray: [8, 4],
                            selectable: !imageEl.locked,
                            evented: !imageEl.locked,
                        });
                        fabricObject = placeholder;
                    }
                } else {
                    // Placeholder for empty/dynamic images
                    const placeholder = new fabric.Rect({
                        left: imageEl.x,
                        top: imageEl.y,
                        width: imageEl.width,
                        height: imageEl.height,
                        fill: '#F3F4F6',
                        stroke: '#D1D5DB',
                        strokeWidth: 2,
                        strokeDashArray: [8, 4],
                        rx: imageEl.cornerRadius || 0,
                        ry: imageEl.cornerRadius || 0,
                        selectable: !imageEl.locked,
                        evented: !imageEl.locked,
                    });
                    fabricObject = placeholder;
                }
            }

            else if (element.type === 'shape') {
                const shapeEl = element as ShapeElement;

                switch (shapeEl.shapeType) {
                    case 'rect':
                        fabricObject = new fabric.Rect({
                            left: shapeEl.x,
                            top: shapeEl.y,
                            width: shapeEl.width,
                            height: shapeEl.height,
                            fill: shapeEl.fill || 'transparent',
                            stroke: shapeEl.stroke || '#000000',
                            strokeWidth: shapeEl.strokeWidth || 1,
                            rx: shapeEl.cornerRadius || 0,
                            ry: shapeEl.cornerRadius || 0,
                            angle: shapeEl.rotation || 0,
                            opacity: shapeEl.opacity,
                            selectable: !shapeEl.locked,
                            evented: !shapeEl.locked,
                        });
                        break;

                    case 'circle':
                        fabricObject = new fabric.Circle({
                            left: shapeEl.x,
                            top: shapeEl.y,
                            radius: Math.min(shapeEl.width, shapeEl.height) / 2,
                            fill: shapeEl.fill || 'transparent',
                            stroke: shapeEl.stroke || '#000000',
                            strokeWidth: shapeEl.strokeWidth || 1,
                            angle: shapeEl.rotation || 0,
                            opacity: shapeEl.opacity,
                            selectable: !shapeEl.locked,
                            evented: !shapeEl.locked,
                        });
                        break;

                    case 'line':
                        const linePoints = (shapeEl.points || [0, 0, shapeEl.width, 0]) as [number, number, number, number];
                        fabricObject = new fabric.Line(linePoints, {
                            left: shapeEl.x,
                            top: shapeEl.y,
                            stroke: shapeEl.stroke || '#000000',
                            strokeWidth: shapeEl.strokeWidth || 1,
                            angle: shapeEl.rotation || 0,
                            opacity: shapeEl.opacity,
                            selectable: !shapeEl.locked,
                            evented: !shapeEl.locked,
                        });
                        break;

                    case 'path':
                        if (shapeEl.pathData) {
                            fabricObject = new fabric.Path(shapeEl.pathData, {
                                left: shapeEl.x,
                                top: shapeEl.y,
                                fill: shapeEl.fill || 'transparent',
                                stroke: shapeEl.stroke || '#000000',
                                strokeWidth: shapeEl.strokeWidth || 1,
                                angle: shapeEl.rotation || 0,
                                opacity: shapeEl.opacity,
                                selectable: !shapeEl.locked,
                                evented: !shapeEl.locked,
                            });
                        }
                        break;
                }
            }

            if (fabricObject) {
                setElementId(fabricObject, element.id);
                canvas.add(fabricObject);
            }
        }

        // Restore selection
        if (selectedId) {
            const objToSelect = canvas.getObjects().find(o => getElementId(o) === selectedId);
            if (objToSelect) {
                canvas.setActiveObject(objToSelect);
            }
        }

        canvas.renderAll();
    }, [elements, backgroundColor, previewMode]);

    // ============================================
    // Effects
    // ============================================

    // Initialize canvas on mount
    useEffect(() => {
        initCanvas().then(() => {
            // Register fabric ref for external access (thumbnail generation)
            setFabricRef(fabricCanvasRef);
        });

        return () => {
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
                fabricCanvasRef.current = null;
            }
        };
    }, [initCanvas, setFabricRef]);

    // Re-render elements when they change (but not from Fabric updates)
    useEffect(() => {
        if (!isUpdatingFromFabric.current) {
            renderElements();
        }
    }, [elements, backgroundColor, previewMode, renderElements]);

    // Update canvas size when zoom changes
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (canvas) {
            canvas.setZoom(zoom);
            canvas.setDimensions({
                width: canvasWidth * zoom,
                height: canvasHeight * zoom,
            });
            canvas.renderAll();
        }
    }, [zoom, canvasWidth, canvasHeight]);

    // Sync store selection to canvas
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || isUpdatingFromFabric.current) return;

        if (selectedIds.length === 0) {
            canvas.discardActiveObject();
        } else {
            const objToSelect = canvas.getObjects().find(o => getElementId(o) === selectedIds[0]);
            if (objToSelect && canvas.getActiveObject() !== objToSelect) {
                canvas.setActiveObject(objToSelect);
            }
        }
        canvas.renderAll();
    }, [selectedIds]);

    // ============================================
    // Text Editing Overlay
    // ============================================
    const editingElement = editingId ? elements.find(el => el.id === editingId) as TextElement | undefined : null;

    return (
        <div
            className="flex items-start justify-start relative"
            style={{
                minWidth: stageWidth,
                minHeight: stageHeight,
                padding: 0,
            }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Gray background area */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: stageWidth,
                    height: stageHeight,
                    backgroundColor: '#e5e7eb',
                }}
            />

            {/* Canvas container with padding */}
            <div
                style={{
                    position: 'relative',
                    marginLeft: CANVAS_PADDING,
                    marginTop: CANVAS_PADDING,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                }}
            >
                <canvas ref={canvasElRef} />
            </div>

            {/* Context Menu */}
            <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                isOpen={contextMenu.isOpen}
                onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
            />

            {/* On-Canvas Text Editing Overlay */}
            {editingElement && (
                <textarea
                    ref={textAreaRef}
                    value={editingElement.text}
                    style={{
                        position: 'absolute',
                        top: (editingElement.y * zoom + CANVAS_PADDING) + 'px',
                        left: (editingElement.x * zoom + CANVAS_PADDING) + 'px',
                        width: (editingElement.width * zoom) + 'px',
                        minHeight: (editingElement.height * zoom) + 'px',
                        fontSize: (editingElement.fontSize * zoom) + 'px',
                        fontFamily: editingElement.fontFamily,
                        color: editingElement.fill,
                        lineHeight: editingElement.lineHeight || 1.2,
                        textAlign: (editingElement.align || 'center') as React.CSSProperties['textAlign'],
                        background: 'transparent',
                        border: '2px dashed #0076D3',
                        borderRadius: '2px',
                        outline: 'none',
                        resize: 'none',
                        padding: '4px',
                        zIndex: 100,
                        transform: `rotate(${editingElement.rotation || 0}deg)`,
                        transformOrigin: 'top left',
                        overflow: 'hidden',
                        boxSizing: 'border-box',
                    }}
                    autoFocus
                    onBlur={() => {
                        setEditingId(null);
                        pushHistory();
                    }}
                    onChange={(e) => {
                        updateElement(editingElement.id, { text: e.target.value });
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            setEditingId(null);
                            pushHistory();
                        }
                        if (e.key === 'Escape') {
                            setEditingId(null);
                        }
                    }}
                />
            )}
        </div>
    );
}
