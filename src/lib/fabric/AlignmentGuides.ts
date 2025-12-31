import * as fabric from 'fabric';
import { useSnappingSettingsStore, SnappingSettings } from '@/stores/snappingSettingsStore';

// --- Types ---

interface SnapCandidate {
    value: number;
    type: 'edge' | 'center';
    priority: number; // 3=Center, 2=Edge
}

interface SnapResult {
    diff: number;
    target: number;
    candidate: SnapCandidate;
}

interface GuideLine {
    x?: number;
    y?: number;
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

    // Snap lock state (prevents jittery snapping)
    private isSnappedX: boolean = false;
    private isSnappedY: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    private escapeVelocity: number = 15;

    // Visual guides for current frame
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

    // --- Cache Building (once per drag start) ---

    private onMouseDown(e: fabric.TPointerEventInfo) {
        if (!this.enabled || !e.target) return;
        if (!this.settings.enabled) return;

        this.activeObject = e.target;
        this.isDragging = true;
        this.isSnappedX = false;
        this.isSnappedY = false;

        this.buildSnapCache(e.target);
    }

    private buildSnapCache(activeObj: fabric.FabricObject) {
        this.verticalCache = [];
        this.horizontalCache = [];

        const zoom = this.canvas.getZoom();
        const canvasWidth = this.canvas.width / zoom;
        const canvasHeight = this.canvas.height / zoom;

        // Canvas center lines
        if (this.settings.snapToCanvasCenter) {
            this.verticalCache.push({ value: canvasWidth / 2, type: 'center', priority: 3 });
            this.horizontalCache.push({ value: canvasHeight / 2, type: 'center', priority: 3 });
        }

        // Canvas boundaries
        if (this.settings.snapToBoundaries) {
            this.verticalCache.push({ value: 0, type: 'edge', priority: 2 });
            this.verticalCache.push({ value: canvasWidth, type: 'edge', priority: 2 });
            this.horizontalCache.push({ value: 0, type: 'edge', priority: 2 });
            this.horizontalCache.push({ value: canvasHeight, type: 'edge', priority: 2 });
        }

        // Other objects
        const objects = this.canvas.getObjects().filter(obj =>
            obj !== activeObj &&
            obj.visible &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            !(obj as any).name?.includes('guide')
        );

        for (const obj of objects) {
            const rect = obj.getBoundingRect();

            if (this.settings.snapToObjectCenters) {
                this.verticalCache.push({ value: rect.left + rect.width / 2, type: 'center', priority: 3 });
                this.horizontalCache.push({ value: rect.top + rect.height / 2, type: 'center', priority: 3 });
            }

            if (this.settings.snapToObjectEdges) {
                this.verticalCache.push({ value: rect.left, type: 'edge', priority: 2 });
                this.verticalCache.push({ value: rect.left + rect.width, type: 'edge', priority: 2 });
                this.horizontalCache.push({ value: rect.top, type: 'edge', priority: 2 });
                this.horizontalCache.push({ value: rect.top + rect.height, type: 'edge', priority: 2 });
            }
        }
    }

    private onMouseUp() {
        this.isDragging = false;
        this.activeObject = null;
        this.clear();
    }

    // --- Main Snap Logic ---

    private onObjectMoving(e: fabric.BasicTransformEvent<fabric.TPointerEvent> & { target: fabric.FabricObject }) {
        if (!this.enabled || !this.isDragging || !this.activeObject) return;
        if (!this.settings.enabled) return;

        const activeObj = e.target;
        const rect = activeObj.getBoundingRect();

        // Track mouse velocity for escape detection
        const pointer = e.e instanceof MouseEvent ? { x: e.e.clientX, y: e.e.clientY } : { x: 0, y: 0 };
        const velX = Math.abs(pointer.x - this.lastMouseX);
        const velY = Math.abs(pointer.y - this.lastMouseY);
        this.lastMouseX = pointer.x;
        this.lastMouseY = pointer.y;

        // Break free from snap if moving fast
        if (this.isSnappedX && velX > this.escapeVelocity) this.isSnappedX = false;
        if (this.isSnappedY && velY > this.escapeVelocity) this.isSnappedY = false;

        this.clear();

        // Points to check for snapping
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

        // Find best snap
        let bestSnapX: SnapResult | null = null;
        let bestSnapY: SnapResult | null = null;

        if (!this.isSnappedX || velX <= 2) {
            bestSnapX = this.findBestSnap(activeXPoints, this.verticalCache);
        }

        if (!this.isSnappedY || velY <= 2) {
            bestSnapY = this.findBestSnap(activeYPoints, this.horizontalCache);
        }

        // Apply snap
        if (bestSnapX) {
            activeObj.set({ left: activeObj.left! + bestSnapX.diff });
            this.isSnappedX = true;
            this.verticalLines.push({ x: bestSnapX.target });
        }

        if (bestSnapY) {
            activeObj.set({ top: activeObj.top! + bestSnapY.diff });
            this.isSnappedY = true;
            this.horizontalLines.push({ y: bestSnapY.target });
        }

        if (bestSnapX || bestSnapY) {
            activeObj.setCoords();
        }

        this.canvas.requestRenderAll();
    }

    private findBestSnap(sourcePoints: { value: number, type: 'edge' | 'center' }[], candidates: SnapCandidate[]): SnapResult | null {
        const threshold = this.settings.snapThreshold;
        let best: SnapResult | null = null;
        let maxScore = -1;

        for (const candidate of candidates) {
            for (const source of sourcePoints) {
                const diff = candidate.value - source.value;
                const dist = Math.abs(diff);

                if (dist < threshold) {
                    // Prefer center-to-center snaps, then closest distance
                    const typeBonus = (candidate.type === 'center' && source.type === 'center') ? 50 : 0;
                    const score = (candidate.priority * 100) + typeBonus - dist;

                    if (score > maxScore) {
                        maxScore = score;
                        best = { diff, target: candidate.value, candidate };
                    }
                }
            }
        }

        return best;
    }

    private clear() {
        if (this.verticalLines.length > 0 || this.horizontalLines.length > 0) {
            this.verticalLines = [];
            this.horizontalLines = [];
            this.canvas.requestRenderAll();
        }
    }

    // --- Rendering ---

    private draw() {
        if (this.verticalLines.length === 0 && this.horizontalLines.length === 0) return;

        this.ctx.save();

        const zoom = this.canvas.getZoom();
        const vpt = this.canvas.viewportTransform;
        if (vpt) {
            this.ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
        }

        const lineWidth = 1 / zoom;
        const color = this.settings.guideColor;

        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeStyle = color;
        this.ctx.setLineDash([4 / zoom, 4 / zoom]);

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
