import * as fabric from 'fabric';
import { useSnappingSettingsStore, SnappingSettings } from '@/stores/snappingSettingsStore';

// --- Types ---

type MagneticZone = 'far' | 'near' | 'lock' | 'none';

interface GuideLine {
    x?: number;
    y?: number;
    x1?: number;
    x2?: number;
    y1?: number;
    y2?: number;
    zone: MagneticZone;
    isBoundary?: boolean;
}

// Optimized Cache Stucture
interface SnapCandidate {
    value: number;
    type: 'edge' | 'center';
    priority: number; // 3=Center, 2=Edge, 1=Grid/Other
    isBoundary: boolean;
    sourceObject?: fabric.FabricObject; // To avoid self-snapping
}

interface SnapResult {
    diff: number;
    target: number;
    zone: MagneticZone;
    candidate: SnapCandidate;
}

export class AlignmentGuides {
    private canvas: fabric.Canvas;
    private ctx: CanvasRenderingContext2D;
    private enabled: boolean = true;
    
    // State
    private isDragging: boolean = false;
    private activeObject: fabric.FabricObject | null = null;
    
    // Cache
    private verticalCache: SnapCandidate[] = [];
    private horizontalCache: SnapCandidate[] = [];

    // Physics state
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    private isSnappedX: boolean = false;
    private isSnappedY: boolean = false;
    private escapeVelocityThreshold: number = 20; // High threshold for "sticky" stable feel

    // Visuals (Single Frame Only)
    private verticalLines: GuideLine[] = [];
    private horizontalLines: GuideLine[] = [];

    // Settings
    private settings: SnappingSettings;

    constructor(canvas: fabric.Canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext();
        this.settings = useSnappingSettingsStore.getState();

        this.onMouseDown = this.onMouseDown.bind(this);
        this.onObjectMoving = this.onObjectMoving.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.draw = this.draw.bind(this);

        useSnappingSettingsStore.subscribe((state) => {
            this.settings = state;
        });

        this.init();
    }

    private init() {
        this.canvas.on('mouse:down', this.onMouseDown);
        this.canvas.on('object:moving', this.onObjectMoving);
        this.canvas.on('mouse:up', this.onMouseUp);
        this.canvas.on('after:render', this.draw);
    }

    public dispose() {
        this.canvas.off('mouse:down', this.onMouseDown);
        this.canvas.off('object:moving', this.onObjectMoving);
        this.canvas.off('mouse:up', this.onMouseUp);
        this.canvas.off('after:render', this.draw);
        this.clear();
    }

    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (!enabled) this.clear();
    }

    // --- Caching Phase ---

    private onMouseDown(e: fabric.TPointerEventInfo) {
        if (!this.enabled || !e.target) return;
        if (!this.settings.magneticSnapping && !this.settings.showGuideLines) return;

        this.activeObject = e.target;
        this.isDragging = true;
        this.isSnappedX = false;
        this.isSnappedY = false;
        
        // Pure calculation, no rendering
        this.buildSnapCache(e.target);
    }

    private buildSnapCache(activeObj: fabric.FabricObject) {
        this.verticalCache = [];
        this.horizontalCache = [];

        const zoom = this.canvas.getZoom();
        const canvasWidth = this.canvas.width / zoom;
        const canvasHeight = this.canvas.height / zoom;

        // 1. Center Lines (Best for alignment)
        if (this.settings.canvasCenterLines) {
            this.verticalCache.push({ value: canvasWidth / 2, type: 'center', priority: 3, isBoundary: false });
            this.horizontalCache.push({ value: canvasHeight / 2, type: 'center', priority: 3, isBoundary: false });
        }

        // 2. Boundaries
        if (this.settings.snapToBoundaries) {
            this.verticalCache.push({ value: 0, type: 'edge', priority: 2, isBoundary: true });
            this.verticalCache.push({ value: canvasWidth, type: 'edge', priority: 2, isBoundary: true });
            this.horizontalCache.push({ value: 0, type: 'edge', priority: 2, isBoundary: true });
            this.horizontalCache.push({ value: canvasHeight, type: 'edge', priority: 2, isBoundary: true });
        }

        // 3. Objects
        // Only checking visible objects, no advanced culling needed for typical usage (<100 objs)
        // Caching here is O(N) once per drag, which is negligible.
        const objects = this.canvas.getObjects().filter(obj => 
            obj !== activeObj && 
            obj.visible && 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            !(obj as any).name?.includes('guide')
        );

        if (this.settings.snapToObjects) {
            for (const obj of objects) {
                const rect = obj.getBoundingRect();

                if (this.settings.objectCenters) {
                    this.verticalCache.push({ value: rect.left + rect.width / 2, type: 'center', priority: 3, isBoundary: false, sourceObject: obj });
                    this.horizontalCache.push({ value: rect.top + rect.height / 2, type: 'center', priority: 3, isBoundary: false, sourceObject: obj });
                }

                if (this.settings.objectEdges) {
                    this.verticalCache.push({ value: rect.left, type: 'edge', priority: 2, isBoundary: false, sourceObject: obj });
                    this.verticalCache.push({ value: rect.left + rect.width, type: 'edge', priority: 2, isBoundary: false, sourceObject: obj });
                    this.horizontalCache.push({ value: rect.top, type: 'edge', priority: 2, isBoundary: false, sourceObject: obj });
                    this.horizontalCache.push({ value: rect.top + rect.height, type: 'edge', priority: 2, isBoundary: false, sourceObject: obj });
                }
            }
        }
    }

    private onMouseUp() {
        this.isDragging = false;
        this.activeObject = null;
        this.clear();
    }

    // --- Main Loop (Optimized) ---

    private onObjectMoving(e: fabric.BasicTransformEvent<fabric.TPointerEvent> & { target: fabric.FabricObject }) {
        if (!this.enabled || !this.isDragging || !this.activeObject) return;

        const activeObj = e.target;
        const rect = activeObj.getBoundingRect();
        
        // Physics: Velocity
        const pointer = e.e instanceof MouseEvent ? { x: e.e.clientX, y: e.e.clientY } : { x: 0, y: 0 };
        const velX = Math.abs(pointer.x - this.lastMouseX);
        const velY = Math.abs(pointer.y - this.lastMouseY);
        this.lastMouseX = pointer.x;
        this.lastMouseY = pointer.y;

        // Physics: Break free
        if (this.isSnappedX && velX > this.escapeVelocityThreshold) this.isSnappedX = false;
        if (this.isSnappedY && velY > this.escapeVelocityThreshold) this.isSnappedY = false;

        this.clear();

        // Snap Calculation
        const activeXPoints = [
            { value: rect.left, type: 'edge' as const },
            { value: rect.left + rect.width / 2, type: 'center' as const },
            { value: rect.left + rect.width, type: 'edge' as const }
        ];

        const activeYPoints = [
            { value: rect.top, type: 'edge' as const },
            { value: rect.top + rect.height / 2, type: 'center' as const },
            { value: rect.top + rect.height, type: 'edge' as const }
        ];

        let bestSnapX: SnapResult | null = null;
        if (!this.isSnappedX || velX <= 2) {
             bestSnapX = this.findBestSnap(activeXPoints, this.verticalCache);
             if (!bestSnapX && this.settings.gridSnapping) {
                 bestSnapX = this.findGridSnap(rect.left, this.settings.gridSize);
             }
        }

        let bestSnapY: SnapResult | null = null;
        if (!this.isSnappedY || velY <= 2) {
            bestSnapY = this.findBestSnap(activeYPoints, this.horizontalCache);
            if (!bestSnapY && this.settings.gridSnapping) {
                bestSnapY = this.findGridSnap(rect.top, this.settings.gridSize);
            }
        }

        // Apply
        let snappedX = false;
        let snappedY = false;

        if (bestSnapX && bestSnapX.zone === 'lock') {
            activeObj.set({ left: activeObj.left! + bestSnapX.diff });
            this.isSnappedX = true;
            snappedX = true;
            
            this.verticalLines.push({
                x: bestSnapX.target,
                y1: -5000,
                y2: 5000,
                zone: 'lock',
                isBoundary: bestSnapX.candidate.isBoundary
            });
        }

        if (bestSnapY && bestSnapY.zone === 'lock') {
            activeObj.set({ top: activeObj.top! + bestSnapY.diff });
            this.isSnappedY = true;
            snappedY = true;

            this.horizontalLines.push({
                y: bestSnapY.target,
                x1: -5000,
                x2: 5000,
                zone: 'lock',
                isBoundary: bestSnapY.candidate.isBoundary
            });
        }

        if (snappedX || snappedY) {
            activeObj.setCoords();
            // NO Celebration trigger
        }

        this.canvas.requestRenderAll();
    }

    private findBestSnap(sourcePoints: { value: number, type: 'edge'|'center' }[], candidates: SnapCandidate[]): SnapResult | null {
        const threshold = this.settings.magneticSnapThreshold || 10;
        let best: SnapResult | null = null;
        let maxScore = -1;

        for (const candidate of candidates) {
            for (const source of sourcePoints) {
                const diff = candidate.value - source.value;
                const dist = Math.abs(diff);

                if (dist < threshold) {
                    const score = (candidate.priority * 100) - dist;
                    if (score > maxScore) {
                        maxScore = score;
                        best = {
                            diff,
                            target: candidate.value,
                            zone: 'lock',
                            candidate
                        };
                    }
                }
            }
        }
        return best;
    }

    private findGridSnap(currentVal: number, gridSize: number): SnapResult | null {
        const threshold = this.settings.magneticSnapThreshold || 10;
        const snappedVal = Math.round(currentVal / gridSize) * gridSize;
        const diff = snappedVal - currentVal;
        
        if (Math.abs(diff) < threshold) {
            return {
                diff,
                target: snappedVal,
                zone: 'lock',
                candidate: { value: snappedVal, type: 'edge', priority: 1, isBoundary: false }
            };
        }
        return null;
    }

    private clear() {
        if (this.verticalLines.length > 0 || this.horizontalLines.length > 0) {
            this.verticalLines = [];
            this.horizontalLines = [];
            this.canvas.requestRenderAll();
        }
    }

    // --- Rendering (Minimal) ---

    private draw() {
        if (this.verticalLines.length === 0 && this.horizontalLines.length === 0) return;

        this.ctx.save();
        const zoom = this.canvas.getZoom();
        const vpt = this.canvas.viewportTransform;
        if (vpt) {
            this.ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
        }

        const lineWidth = 1 / zoom;
        const color = this.settings.guideColor || '#F63E97';
        
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeStyle = color;

        // Simple Lines, No Dashes, No Glows, Just Draw
        this.ctx.beginPath();
        for (const v of this.verticalLines) {
            this.ctx.moveTo(v.x!, -5000);
            this.ctx.lineTo(v.x!, 5000);
        }
        for (const h of this.horizontalLines) {
             this.ctx.moveTo(-5000, h.y!);
             this.ctx.lineTo(5000, h.y!);
        }
        this.ctx.stroke();

        this.ctx.restore();
    }
}
