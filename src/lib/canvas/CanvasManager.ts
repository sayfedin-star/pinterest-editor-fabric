import * as fabric from 'fabric';
import { Element } from '@/types/editor';
import { AlignmentGuides } from '../fabric/AlignmentGuides';
import { SnappingSettings } from '@/stores/snappingSettingsStore';
import { SpatialHashGrid, GridElement } from './SpatialHashGrid';

/**
 * Canvas configuration options
 */
export interface CanvasConfig {
    width: number;
    height: number;
    backgroundColor?: string;
    zoom?: number;
}

/**
 * Element state change callback
 */
export type ElementChangeCallback = (elements: Element[]) => void;

/**
 * Selection change callback
 */
export type SelectionChangeCallback = (selectedIds: string[]) => void;

/**
 * Performance metrics
 */
interface PerformanceMetrics {
    fps: number;
    frames: number;
    lastTime: number;
    snapCalcTime: number;
    lastSnapDuration: number;
}

/**
 * CanvasManager - Imperative Core (Layer 1)
 * 
 * Owns all Fabric.js lifecycle and is the ONLY thing that touches the canvas directly.
 * Never triggers React re-renders directly - reports state changes through callbacks.
 * 
 * Key Principles:
 * - Single source of truth for canvas state during interactions
 * - Batches operations and reports changes on completion
 * - Maintains internal state separate from React state
 * - Exposes high-level API that React can call safely
 */
export class CanvasManager {
    // Core Fabric.js instance
    private canvas: fabric.Canvas | null = null;

    // Element tracking
    private elementMap: Map<string, fabric.FabricObject> = new Map();

    // Features
    private guides: AlignmentGuides | null = null;
    private spatialGrid: SpatialHashGrid | null = null;

    // Configuration
    private config: CanvasConfig | null = null;
    private enabled: boolean = false;

    // Callbacks
    private onElementsChangedCallback: ElementChangeCallback | null = null;
    private onSelectionChangedCallback: SelectionChangeCallback | null = null;

    // Performance tracking
    private metrics: PerformanceMetrics = {
        fps: 60,
        frames: 0,
        lastTime: performance.now(),
        snapCalcTime: 0,
        lastSnapDuration: 0
    };
    private collisionCalcTime: number = 0; // Track collision detection timing

    private metricsInterval: number | null = null;

    /**
     * Initialize the canvas manager with a canvas element
     */
    initialize(canvasElement: HTMLCanvasElement, config: CanvasConfig): void {
        if (this.canvas) {
            console.warn('[CanvasManager] Already initialized, destroying previous instance');
            this.destroy();
        }

        console.log('[CanvasManager] Initializing with config:', config);

        this.config = config;

        // Create Fabric canvas with performance-optimized settings
        this.canvas = new fabric.Canvas(canvasElement, {
            width: config.width,
            height: config.height,
            backgroundColor: config.backgroundColor || '#ffffff',
            selection: true,
            preserveObjectStacking: true,
            renderOnAddRemove: true,
            enableRetinaScaling: true,
            // Performance optimizations
            imageSmoothingEnabled: false,
            skipOffscreen: true,
        });

        // Apply zoom if specified
        if (config.zoom && config.zoom !== 1) {
            this.setZoom(config.zoom);
        }

        // Initialize alignment guides
        this.guides = new AlignmentGuides(this.canvas);
        this.guides.init();

        // Initialize spatial hash grid for collision optimization
        this.spatialGrid = new SpatialHashGrid({
            canvasWidth: config.width,
            canvasHeight: config.height,
            cellSize: 100, // 100px cells - adjust based on average element size
        });

        // Bind event handlers
        this.bindEvents();

        // Start performance monitoring
        this.startPerformanceMonitoring();

        this.enabled = true;
        console.log('[CanvasManager] Initialization complete');
    }

    /**
     * Clean up and destroy the canvas
     */
    destroy(): void {
        console.log('[CanvasManager] Destroying canvas');

        this.enabled = false;

        // Stop performance monitoring
        this.stopPerformanceMonitoring();

        // Dispose alignment guides
        if (this.guides) {
            this.guides.dispose();
            this.guides = null;
        }

        // Clear spatial grid
        if (this.spatialGrid) {
            this.spatialGrid.clear();
            this.spatialGrid = null;
        }

        // Unbind events
        this.unbindEvents();

        // Clear element map
        this.elementMap.clear();

        // Dispose canvas
        if (this.canvas) {
            this.canvas.dispose();
            this.canvas = null;
        }

        this.config = null;
        console.log('[CanvasManager] Destruction complete');
    }

    /**
     * Check if canvas is initialized
     */
    isInitialized(): boolean {
        return this.canvas !== null && this.enabled;
    }

    /**
     * Add an element to the canvas
     */
    addElement(element: Element): void {
        if (!this.canvas) {
            console.error('[CanvasManager] Cannot add element: canvas not initialized');
            return;
        }

        console.log('[CanvasManager] Adding element:', element.id, element.type);

        // Create Fabric object from element
        const fabricObject = this.createFabricObject(element);

        if (!fabricObject) {
            console.error('[CanvasManager] Failed to create Fabric object for element:', element.id);
            return;
        }

        // Store in element map
        this.elementMap.set(element.id, fabricObject);

        // Add to canvas
        this.canvas.add(fabricObject);

        // Register in spatial grid for collision detection
        if (this.spatialGrid) {
            this.spatialGrid.insert({
                id: element.id,
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
            });
        }

        this.canvas.renderAll();
    }

    /**
     * Update an existing element on the canvas
     */
    updateElement(id: string, updates: Partial<Element>): void {
        if (!this.canvas) {
            console.error('[CanvasManager] Cannot update element: canvas not initialized');
            return;
        }

        const fabricObject = this.elementMap.get(id);

        if (!fabricObject) {
            console.warn('[CanvasManager] Element not found for update:', id);
            return;
        }

        console.log('[CanvasManager] Updating element:', id);

        // Apply updates to Fabric object
        this.syncElementToFabric(fabricObject, updates);

        // Update spatial grid if position/size changed
        if (this.spatialGrid && (updates.x !== undefined || updates.y !== undefined || updates.width !== undefined || updates.height !== undefined)) {
            this.spatialGrid.update({
                id,
                left: fabricObject.left || 0,
                top: fabricObject.top || 0,
                width: fabricObject.width || 0,
                height: fabricObject.height || 0,
            });
        }

        this.canvas.renderAll();
    }

    /**
     * Remove an element from the canvas
     */
    removeElement(id: string): void {
        if (!this.canvas) {
            console.error('[CanvasManager] Cannot remove element: canvas not initialized');
            return;
        }

        const fabricObject = this.elementMap.get(id);

        if (!fabricObject) {
            console.warn('[CanvasManager] Element not found for removal:', id);
            return;
        }

        console.log('[CanvasManager] Removing element:', id);

        // Remove from canvas
        this.canvas.remove(fabricObject);

        // Remove from element map
        this.elementMap.delete(id);

        this.canvas.renderAll();
    }

    /**
     * Replace all elements on the canvas (used for undo/redo)
     */
    replaceAllElements(elements: Element[]): void {
        if (!this.canvas) {
            console.error('[CanvasManager] Cannot replace elements: canvas not initialized');
            return;
        }

        console.log('[CanvasManager] Replacing all elements:', elements.length);

        // Get current element IDs
        const currentIds = new Set(this.elementMap.keys());
        const newIds = new Set(elements.map(el => el.id));

        // Remove elements that are no longer in the new set
        for (const id of currentIds) {
            if (!newIds.has(id)) {
                const fabricObject = this.elementMap.get(id);
                if (fabricObject) {
                    this.canvas.remove(fabricObject);
                    this.elementMap.delete(id);
                }
            }
        }

        // Add or update elements
        for (const element of elements) {
            const existingObject = this.elementMap.get(element.id);

            if (existingObject) {
                // Update existing object
                this.syncElementToFabric(existingObject, element);
            } else {
                // Add new object
                this.addElement(element);
            }
        }

        this.canvas.renderAll();
        console.log('[CanvasManager] Element replacement complete');
    }

    /**
     * Set canvas size
     */
    setCanvasSize(width: number, height: number): void {
        if (!this.canvas || !this.config) {
            console.error('[CanvasManager] Cannot set canvas size: canvas not initialized');
            return;
        }

        console.log('[CanvasManager] Setting canvas size:', width, 'x', height);

        this.config.width = width;
        this.config.height = height;

        // Update Fabric canvas dimensions (accounting for zoom)
        const zoom = this.canvas.getZoom();
        this.canvas.setWidth(width * zoom);
        this.canvas.setHeight(height * zoom);

        this.canvas.renderAll();

        // Re-initialize guides for new dimensions
        if (this.guides) {
            this.guides.init();
        }
    }

    /**
     * Set background color
     */
    setBackgroundColor(color: string): void {
        if (!this.canvas || !this.config) {
            console.error('[CanvasManager] Cannot set background color: canvas not initialized');
            return;
        }

        console.log('[CanvasManager] Setting background color:', color);

        this.config.backgroundColor = color;
        this.canvas.backgroundColor = color;
        this.canvas.renderAll();
    }

    /**
     * Get current element state from canvas
     */
    getElementState(id: string): Element | null {
        const fabricObject = this.elementMap.get(id);

        if (!fabricObject) {
            return null;
        }

        // Extract element data from Fabric object
        return this.syncFabricToElement(fabricObject);
    }

    /**
     * Get current selection
     */
    getSelection(): string[] {
        if (!this.canvas) {
            return [];
        }

        const activeObjects = this.canvas.getActiveObjects();
        return activeObjects
            .map(obj => (obj as any).id)
            .filter((id): id is string => typeof id === 'string');
    }

    /**
     * Set zoom level
     */
    setZoom(zoom: number): void {
        if (!this.canvas || !this.config) {
            console.error('[CanvasManager] Cannot set zoom: canvas not initialized');
            return;
        }

        console.log('[CanvasManager] Setting zoom:', zoom);

        // Update zoom
        this.canvas.setZoom(zoom);

        // CRITICAL: Also update canvas dimensions to match new zoom
        // Without this, elements disappear at different zoom levels
        this.canvas.setDimensions({
            width: this.config.width * zoom,
            height: this.config.height * zoom
        });

        this.canvas.renderAll();

        if (this.guides) {
            this.guides.init(); // Re-initialize guides for new zoom
        }
    }

    /**
     * Update snapping settings
     */
    updateSnappingSettings(settings: SnappingSettings): void {
        if (!this.guides) {
            console.warn('[CanvasManager] Cannot update snapping: guides not initialized');
            return;
        }

        console.log('[CanvasManager] Updating snapping settings:', settings);

        // AlignmentGuides will be modified to support updateSettings()
        // For now, toggle enabled state
        this.guides.setEnabled(settings.magneticSnapping);
    }

    /**
     * Register callback for element changes
     */
    onElementsChanged(callback: ElementChangeCallback): void {
        this.onElementsChangedCallback = callback;
    }

    /**
     * Register callback for selection changes
     */
    onSelectionChanged(callback: SelectionChangeCallback): void {
        this.onSelectionChangedCallback = callback;
    }

    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================

    /**
     * Bind Fabric.js event handlers
     */
    private bindEvents(): void {
        if (!this.canvas) return;

        this.canvas.on('object:modified', this.handleObjectModified);
        this.canvas.on('selection:created', this.handleSelectionChanged);
        this.canvas.on('selection:updated', this.handleSelectionChanged);
        this.canvas.on('selection:cleared', this.handleSelectionChanged);
    }

    /**
     * Unbind Fabric.js event handlers
     */
    private unbindEvents(): void {
        if (!this.canvas) return;

        this.canvas.off('object:modified', this.handleObjectModified);
        this.canvas.off('selection:created', this.handleSelectionChanged);
        this.canvas.off('selection:updated', this.handleSelectionChanged);
        this.canvas.off('selection:cleared', this.handleSelectionChanged);
    }

    /**
   * Handle object modified event (after drag/resize/rotate)
   */
    private handleObjectModified = (e: fabric.ModifiedEvent<fabric.TPointerEvent>): void => {
        // Get target from transform or action
        const target = e.transform?.target || (e as any).target;
        if (!target || !this.onElementsChangedCallback) return;

        const modifiedObjects = target.type === 'activeselection'
            ? (target as fabric.ActiveSelection).getObjects()
            : [target];

        // Extract updated element data
        const updatedElements: Element[] = [];

        for (const obj of modifiedObjects) {
            const element = this.syncFabricToElement(obj);
            if (element) {
                updatedElements.push(element);
            }
        }

        if (updatedElements.length > 0) {
            console.log('[CanvasManager] Objects modified, notifying callback');
            this.onElementsChangedCallback(updatedElements);
        }
    };

    /**
     * Handle selection change events
     */
    private handleSelectionChanged = (): void => {
        if (!this.onSelectionChangedCallback) return;

        const selectedIds = this.getSelection();
        console.log('[CanvasManager] Selection changed:', selectedIds);
        this.onSelectionChangedCallback(selectedIds);
    };

    /**
     * Create Fabric object from element data
     */
    private createFabricObject(element: Element): fabric.FabricObject | null {
        let obj: fabric.FabricObject | null = null;

        switch (element.type) {
            case 'text':
                obj = new fabric.Textbox(element.text, {
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    fontSize: element.fontSize,
                    fontFamily: element.fontFamily,
                    fill: element.fill,
                    textAlign: element.align,
                });
                break;

            case 'image':
                // For Week 1 POC, use colored rectangle placeholder
                obj = new fabric.Rect({
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    fill: '#cccccc',
                });
                break;

            case 'shape':
                if (element.shapeType === 'rect') {
                    obj = new fabric.Rect({
                        left: element.x,
                        top: element.y,
                        width: element.width,
                        height: element.height,
                        fill: element.fill,
                        stroke: element.stroke,
                        strokeWidth: element.strokeWidth,
                        rx: element.cornerRadius || 0,
                        ry: element.cornerRadius || 0,
                    });
                } else if (element.shapeType === 'circle') {
                    obj = new fabric.Circle({
                        left: element.x,
                        top: element.y,
                        radius: element.width / 2,
                        fill: element.fill,
                        stroke: element.stroke,
                        strokeWidth: element.strokeWidth,
                    });
                }
                break;
        }

        if (obj) {
            // Store element ID and metadata
            (obj as any).id = element.id;
            (obj as any).name = element.name;

            // Apply common properties
            obj.set({
                angle: element.rotation,
                opacity: element.opacity,
                selectable: !element.locked,
                evented: !element.locked,
            });
        }

        return obj;
    }

    /**
     * Sync element updates to Fabric object
     */
    private syncElementToFabric(fabricObject: fabric.FabricObject, updates: Partial<Element>): void {
        const props: any = {};

        if (updates.x !== undefined) props.left = updates.x;
        if (updates.y !== undefined) props.top = updates.y;
        if (updates.width !== undefined) props.width = updates.width;
        if (updates.height !== undefined) props.height = updates.height;
        if (updates.rotation !== undefined) props.angle = updates.rotation;
        if (updates.opacity !== undefined) props.opacity = updates.opacity;
        if (updates.locked !== undefined) {
            props.selectable = !updates.locked;
            props.evented = !updates.locked;
        }

        fabricObject.set(props);
    }

    /**
     * Extract element data from Fabric object
     */
    private syncFabricToElement(fabricObject: fabric.FabricObject): Element | null {
        const id = (fabricObject as any).id;
        const name = (fabricObject as any).name || 'Untitled';

        if (!id) {
            console.warn('[CanvasManager] Fabric object missing ID');
            return null;
        }

        // Base properties common to all elements
        const base = {
            id,
            name,
            x: fabricObject.left || 0,
            y: fabricObject.top || 0,
            width: fabricObject.width || 0,
            height: fabricObject.height || 0,
            rotation: fabricObject.angle || 0,
            opacity: fabricObject.opacity || 1,
            locked: !fabricObject.selectable,
            visible: fabricObject.visible !== false,
            zIndex: 0, // TODO: Calculate from canvas order
        };

        // Type-specific properties (simplified for POC)
        if (fabricObject instanceof fabric.Textbox) {
            return {
                ...base,
                type: 'text',
                text: fabricObject.text || '',
                fontFamily: fabricObject.fontFamily || 'Arial',
                fontSize: fabricObject.fontSize || 16,
                fontStyle: 'normal',
                fill: fabricObject.fill as string || '#000000',
                align: (fabricObject.textAlign as any) || 'left',
                verticalAlign: 'top',
                lineHeight: 1.2,
                letterSpacing: 0,
                textDecoration: '',
                isDynamic: false,
            };
        } else if (fabricObject instanceof fabric.Rect) {
            return {
                ...base,
                type: 'shape',
                shapeType: 'rect',
                fill: fabricObject.fill as string || '#000000',
                stroke: fabricObject.stroke as string || '#000000',
                strokeWidth: fabricObject.strokeWidth || 0,
                cornerRadius: fabricObject.rx || 0,
            };
        } else if (fabricObject instanceof fabric.Circle) {
            return {
                ...base,
                type: 'shape',
                shapeType: 'circle',
                fill: fabricObject.fill as string || '#000000',
                stroke: fabricObject.stroke as string || '#000000',
                strokeWidth: fabricObject.strokeWidth || 0,
            };
        }

        return null;
    }

    /**
     * Start performance monitoring
     */
    private startPerformanceMonitoring(): void {
        console.log('[CanvasManager] Starting performance monitoring');

        // Measure FPS during render
        const measureFPS = () => {
            this.metrics.frames++;
            const now = performance.now();
            const delta = now - this.metrics.lastTime;

            if (delta >= 1000) {
                this.metrics.fps = Math.round((this.metrics.frames * 1000) / delta);
                this.metrics.frames = 0;
                this.metrics.lastTime = now;

                // Only log if FPS drops below threshold
                if (this.metrics.fps < 55) {
                    console.warn(`[CanvasManager] Low FPS: ${this.metrics.fps}`);
                }
            }
        };

        // Monitor during canvas renders
        if (this.canvas) {
            this.canvas.on('after:render', measureFPS);
        }

        // Log metrics every 5 seconds
        this.metricsInterval = window.setInterval(() => {
            console.log('[CanvasManager] Performance Metrics:', {
                fps: this.metrics.fps,
                lastSnapDuration: this.metrics.lastSnapDuration.toFixed(2) + 'ms',
                elementCount: this.elementMap.size,
            });
        }, 5000);
    }

    /**
     * Stop performance monitoring
     */
    private stopPerformanceMonitoring(): void {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }

        if (this.canvas) {
            this.canvas.off('after:render');
        }
    }

    /**
     * Get current performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }
}
