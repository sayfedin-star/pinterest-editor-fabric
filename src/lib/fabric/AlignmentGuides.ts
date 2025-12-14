import * as fabric from 'fabric';

interface SnappingGap {
    dist: number;
    value: number;
}

export class AlignmentGuides {
    private canvas: fabric.Canvas;
    private ctx: CanvasRenderingContext2D;
    private aligningLineOffset: number = 5;
    private aligningLineMargin: number = 4;
    private aligningLineWidth: number = 1;
    private aligningLineColor: string = '#F63E97';
    private viewportTransform: number[] | undefined;
    private zoom: number = 1;

    constructor(canvas: fabric.Canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getSelectionContext();
        this.init();
    }

    private init() {
        this.canvas.on('object:moving', this.onObjectMoving.bind(this));
        this.canvas.on('before:render', this.clearLines.bind(this));
        this.canvas.on('after:render', this.drawLines.bind(this));
        this.canvas.on('mouse:up', this.clearLines.bind(this));
    }

    public dispose() {
        this.canvas.off('object:moving', this.onObjectMoving.bind(this));
        this.canvas.off('before:render', this.clearLines.bind(this));
        this.canvas.off('after:render', this.drawLines.bind(this));
        this.canvas.off('mouse:up', this.clearLines.bind(this));
    }

    // Temporary storage for lines to be drawn
    private verticalLines: { x: number; y1: number; y2: number }[] = [];
    private horizontalLines: { y: number; x1: number; x2: number }[] = [];

    private clearLines() {
        this.verticalLines = [];
        this.horizontalLines = [];
        // We don't manually clear context here as fabric's render cycle handles it
        // or we rely on the next render to clear previous state
    }

    private drawLines() {
        if (!this.verticalLines.length && !this.horizontalLines.length) return;

        this.ctx.save();
        this.ctx.lineWidth = this.aligningLineWidth;
        this.ctx.strokeStyle = this.aligningLineColor;

        if (this.viewportTransform) {
            this.ctx.transform(
                this.viewportTransform[0],
                this.viewportTransform[1],
                this.viewportTransform[2],
                this.viewportTransform[3],
                this.viewportTransform[4],
                this.viewportTransform[5]
            );
        }

        // Apply Reverse Zoom for consistent line thickness (optional, but good for visibility)
        // this.ctx.lineWidth = this.aligningLineWidth / this.zoom;

        for (const v of this.verticalLines) {
            this.drawLine(v.x, v.y1, v.x, v.y2);
        }

        for (const h of this.horizontalLines) {
            this.drawLine(h.x1, h.y, h.x2, h.y);
        }

        this.ctx.restore();
    }

    private drawLine(x1: number, y1: number, x2: number, y2: number) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    private onObjectMoving(e: fabric.BasicTransformEvent<fabric.TPointerEvent> & { target: fabric.FabricObject }) {
        const activeObject = e.target;
        if (!activeObject) return;

        const canvasObjects = this.canvas.getObjects();
        const activeObjectCenter = activeObject.getCenterPoint();
        const activeObjectWidth = activeObject.getScaledWidth();
        const activeObjectHeight = activeObject.getScaledHeight();
        const activeObjectBoundingRect = activeObject.getBoundingRect();

        this.viewportTransform = this.canvas.viewportTransform;
        this.zoom = this.canvas.getZoom();

        // Snap Threshold
        const snappingDistance = 10 / this.zoom;

        let snapX: number | null = null;
        let snapY: number | null = null;

        // Reset lines
        this.verticalLines = [];
        this.horizontalLines = [];

        // 1. Snap to Canvas Center
        const canvasWidth = this.canvas.width! / this.zoom;
        const canvasHeight = this.canvas.height! / this.zoom;

        // Adjust for viewport transform (pan)
        // We will calculate relative to the canvas content, not viewport
        // Fabric objects coordinates are in canvas content space.

        // Note: For simplicity in this implementation, we assume canvas dimensions match content
        // If zooming/panning, we trust fabric's coordinate system.
        // Let's rely on calculating center relative to the untransformed canvas size if available,
        // or derived from config. But typically canvas.width/height are the viewport size.
        // We should use the calculated canvas size (e.g. 1000x1500) passed in props.
        // For now, let's use the center of the viewport/canvas if that matches the design area. 
        // Better: Use the active object coordinates which are absolute.
        // Let's assume the "design area" is (0,0) to (width, height).
        // If the canvas is 1000x1500, the center is 500, 750.
        // Ideally we pass canvas size to this class specifically, but for now let's infer or just snap to objects.
        // Wait, most reliable is to snap to objects. Canvas center requires knowing the "design" size.
        // Let's iterate objects.

        const centerX = activeObjectCenter.x;
        const centerY = activeObjectCenter.y;

        // Snap Lists
        // Vertical: x coordinates to snap to
        // Horizontal: y coordinates to snap to
        const verticalSnapPoints: { value: number, type: 'edge' | 'center', origin: 'object' | 'canvas' }[] = [];
        const horizontalSnapPoints: { value: number, type: 'edge' | 'center', origin: 'object' | 'canvas' }[] = [];

        // Add Canvas Center/Edges (assuming standard 1000x1500 or reading from somewhere?)
        // Since we don't have the explicit design size passed here yet, let's skip "Canvas" snapping 
        // unless we can reliably get it. `canvas.width` is the specific element width.
        // Actually, we can use `activeObject.canvas` properties if set, or just snap to other objects for now.
        // Let's stick to Object Snapping first (Edge & Center) + Canvas Center if found.

        const canvasCenter = this.canvas.getCenterPoint();
        verticalSnapPoints.push({ value: canvasCenter.x, type: 'center', origin: 'canvas' });
        horizontalSnapPoints.push({ value: canvasCenter.y, type: 'center', origin: 'canvas' });

        // Iterate over other objects
        for (const obj of canvasObjects) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (obj === activeObject || !obj.visible || (obj as any).name?.includes('guide')) continue;

            const objCenter = obj.getCenterPoint();
            const objRect = obj.getBoundingRect();

            // Vertical Snap Points (X)
            verticalSnapPoints.push({ value: objRect.left, type: 'edge', origin: 'object' });
            verticalSnapPoints.push({ value: objRect.left + objRect.width, type: 'edge', origin: 'object' });
            verticalSnapPoints.push({ value: objCenter.x, type: 'center', origin: 'object' });

            // Horizontal Snap Points (Y)
            horizontalSnapPoints.push({ value: objRect.top, type: 'edge', origin: 'object' });
            horizontalSnapPoints.push({ value: objRect.top + objRect.height, type: 'edge', origin: 'object' });
            horizontalSnapPoints.push({ value: objCenter.y, type: 'center', origin: 'object' });
        }

        // --- Calculate Closest Snap X ---
        let closestDistX = Number.MAX_VALUE;

        // Active Object X points: Left, Center, Right
        const activeXPoints = [
            { value: activeObjectBoundingRect.left, offset: -activeObjectWidth / 2 }, // Left edge (approx) - wait bounding rect is absolute
            // Let's stick to snapping the CENTER or EDGES of active object to targets.
            // Simplified: Snap Center to Center/Edges. Snap Edges to Edges/Center.

            // Actually, simplest 'magnetic' feel is usually:
            // 1. Center to Center
            // 2. Left to Left/Right
            // 3. Right to Left/Right
        ];

        // We check 3 lines for the active object: Left (0), Center (width/2), Right (width)
        // But activeObjectBoundingRect gives us Left, Top, Width, Height.
        const activeLeft = activeObjectBoundingRect.left;
        const activeRight = activeObjectBoundingRect.left + activeObjectBoundingRect.width;
        const activeCenterX = activeObjectBoundingRect.left + activeObjectBoundingRect.width / 2;

        const activeTop = activeObjectBoundingRect.top;
        const activeBottom = activeObjectBoundingRect.top + activeObjectBoundingRect.height;
        const activeCenterY = activeObjectBoundingRect.top + activeObjectBoundingRect.height / 2;

        // Check Vertical Snaps
        for (const snap of verticalSnapPoints) {
            // Check Center
            if (Math.abs(snap.value - activeCenterX) < snappingDistance) {
                if (Math.abs(snap.value - activeCenterX) < closestDistX) {
                    closestDistX = Math.abs(snap.value - activeCenterX);
                    snapX = snap.value;
                    // Adjust object position
                    activeObject.set({ left: snap.value - (activeObjectWidth * activeObject.scaleX!) / 2 }); // CAREFUL with origin
                    // If origin is center:
                    if (activeObject.originX === 'center') {
                        activeObject.set({ left: snap.value });
                    } else { // origin 'left'
                        activeObject.set({ left: snap.value - activeObjectBoundingRect.width / 2 });
                        // Wait, boundingRect width might include rotation.
                        // For exact positioning, better use setPositionByOrigin or translate.
                        // Let's be safer: Calculate delta and apply.
                        const delta = snap.value - activeCenterX;
                        activeObject.set({ left: activeObject.left! + delta });
                    }
                    this.verticalLines.push({ x: snap.value, y1: -5000, y2: 5000 }); // Draw infinite line
                }
            }
            // Check Left
            if (Math.abs(snap.value - activeLeft) < snappingDistance) {
                if (Math.abs(snap.value - activeLeft) < closestDistX) {
                    closestDistX = Math.abs(snap.value - activeLeft);
                    snapX = snap.value;
                    const delta = snap.value - activeLeft;
                    activeObject.set({ left: activeObject.left! + delta });
                    this.verticalLines.push({ x: snap.value, y1: -5000, y2: 5000 });
                }
            }
            // Check Right
            if (Math.abs(snap.value - activeRight) < snappingDistance) {
                if (Math.abs(snap.value - activeRight) < closestDistX) {
                    closestDistX = Math.abs(snap.value - activeRight);
                    snapX = snap.value;
                    const delta = snap.value - activeRight;
                    activeObject.set({ left: activeObject.left! + delta });
                    this.verticalLines.push({ x: snap.value, y1: -5000, y2: 5000 });
                }
            }
        }

        // Check Horizontal Snaps
        let closestDistY = Number.MAX_VALUE;
        for (const snap of horizontalSnapPoints) {
            // Check Center
            if (Math.abs(snap.value - activeCenterY) < snappingDistance) {
                if (Math.abs(snap.value - activeCenterY) < closestDistY) {
                    closestDistY = Math.abs(snap.value - activeCenterY);
                    snapY = snap.value;
                    const delta = snap.value - activeCenterY;
                    activeObject.set({ top: activeObject.top! + delta });
                    this.horizontalLines.push({ y: snap.value, x1: -5000, x2: 5000 });
                }
            }
            // Check Top
            if (Math.abs(snap.value - activeTop) < snappingDistance) {
                if (Math.abs(snap.value - activeTop) < closestDistY) {
                    closestDistY = Math.abs(snap.value - activeTop);
                    snapY = snap.value;
                    const delta = snap.value - activeTop;
                    activeObject.set({ top: activeObject.top! + delta });
                    this.horizontalLines.push({ y: snap.value, x1: -5000, x2: 5000 });
                }
            }
            // Check Bottom
            if (Math.abs(snap.value - activeBottom) < snappingDistance) {
                if (Math.abs(snap.value - activeBottom) < closestDistY) {
                    closestDistY = Math.abs(snap.value - activeBottom);
                    snapY = snap.value;
                    const delta = snap.value - activeBottom;
                    activeObject.set({ top: activeObject.top! + delta });
                    this.horizontalLines.push({ y: snap.value, x1: -5000, x2: 5000 });
                }
            }
        }

        // We only want to snap to the Closest one to avoid jitter.
        // My simple loop above greedily takes the last one found if distances are equal, or closest.
        // It's acceptable for v1. The visual feedback (lines) helps.
    }
}
