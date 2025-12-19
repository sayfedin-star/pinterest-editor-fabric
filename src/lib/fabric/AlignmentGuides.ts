import * as fabric from 'fabric';
import { useSnappingSettingsStore, SnappingSettings } from '@/stores/snappingSettingsStore';

// Types for graduated magnetism
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

interface DistanceBadge {
    x: number;
    y: number;
    text: string;
    axis: 'x' | 'y';
    zone: MagneticZone;
}

export class AlignmentGuides {
    private canvas: fabric.Canvas;
    private ctx: CanvasRenderingContext2D;
    private viewportTransform: number[] | undefined;
    private zoom: number = 1;
    private isScaling: boolean = false;
    private enabled: boolean = true;

    // Visual Data
    private verticalLines: GuideLine[] = [];
    private horizontalLines: GuideLine[] = [];
    private distanceBadges: DistanceBadge[] = [];
    private celebrationActive: boolean = false;
    private celebrationProgress: number = 0;
    private celebrationX: number = 0;
    private celebrationY: number = 0;

    // Settings (synced from store)
    private settings: SnappingSettings;

    constructor(canvas: fabric.Canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext();
        this.settings = useSnappingSettingsStore.getState();

        // Auto-bind handlers
        this.onObjectMoving = this.onObjectMoving.bind(this);
        this.clearLines = this.clearLines.bind(this);
        this.drawLines = this.drawLines.bind(this);
        this.onScaling = this.onScaling.bind(this);
        this.onModified = this.onModified.bind(this);

        // Subscribe to settings changes
        useSnappingSettingsStore.subscribe((state) => {
            this.settings = state;
        });

        this.init();
    }

    init() {
        this.canvas.on('object:moving', this.onObjectMoving);
        this.canvas.on('object:scaling', this.onScaling);
        this.canvas.on('object:modified', this.onModified);
        this.canvas.on('after:render', this.drawLines);
        this.canvas.on('mouse:up', this.clearLines);
    }

    dispose() {
        this.canvas.off('object:moving', this.onObjectMoving);
        this.canvas.off('object:scaling', this.onScaling);
        this.canvas.off('object:modified', this.onModified);
        this.canvas.off('after:render', this.drawLines);
        this.canvas.off('mouse:up', this.clearLines);
        this.clearLines();
    }

    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (!enabled) this.clearLines();
    }

    private onScaling(e: fabric.BasicTransformEvent<fabric.TPointerEvent> & { target: fabric.FabricObject }) {
        this.isScaling = true;
        this.onObjectScaling(e);
    }

    private onModified() {
        this.isScaling = false;
        this.clearLines();
    }

    /**
     * Show alignment guides during scaling/resize operations
     * Similar to onObjectMoving but works with scaling transforms
     */
    private onObjectScaling(e: fabric.BasicTransformEvent<fabric.TPointerEvent> & { target: fabric.FabricObject }) {
        if (!this.enabled) return;
        if (!this.settings.magneticSnapping && !this.settings.showGuideLines) return;

        const activeObject = e.target;
        if (!activeObject) return;

        const canvasObjects = this.canvas.getObjects();
        const activeRect = activeObject.getBoundingRect();

        this.viewportTransform = this.canvas.viewportTransform;
        this.zoom = this.canvas.getZoom();

        const canvasWidth = this.canvas.width / this.zoom;
        const canvasHeight = this.canvas.height / this.zoom;

        this.clearLines();

        // --- Gather Snap Candidates ---
        interface SnapCandidate {
            value: number;
            type: 'edge' | 'center';
            isBoundary: boolean;
        }

        const verticalCandidates: SnapCandidate[] = [];
        const horizontalCandidates: SnapCandidate[] = [];

        // Canvas Boundaries (most important for resize)
        if (this.settings.snapToBoundaries) {
            verticalCandidates.push({ value: 0, type: 'edge', isBoundary: true });
            verticalCandidates.push({ value: canvasWidth, type: 'edge', isBoundary: true });
            horizontalCandidates.push({ value: 0, type: 'edge', isBoundary: true });
            horizontalCandidates.push({ value: canvasHeight, type: 'edge', isBoundary: true });
        }

        // Canvas Center Lines
        if (this.settings.canvasCenterLines) {
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            verticalCandidates.push({ value: centerX, type: 'center', isBoundary: false });
            horizontalCandidates.push({ value: centerY, type: 'center', isBoundary: false });
        }

        // Other Objects
        if (this.settings.snapToObjects) {
            for (const obj of canvasObjects) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (obj === activeObject || !obj.visible || (obj as any).name?.includes('guide')) continue;

                const objRect = obj.getBoundingRect();

                if (this.settings.objectEdges) {
                    verticalCandidates.push(
                        { value: objRect.left, type: 'edge', isBoundary: false },
                        { value: objRect.left + objRect.width, type: 'edge', isBoundary: false }
                    );
                    horizontalCandidates.push(
                        { value: objRect.top, type: 'edge', isBoundary: false },
                        { value: objRect.top + objRect.height, type: 'edge', isBoundary: false }
                    );
                }

                if (this.settings.objectCenters) {
                    verticalCandidates.push({ value: objRect.left + objRect.width / 2, type: 'center', isBoundary: false });
                    horizontalCandidates.push({ value: objRect.top + objRect.height / 2, type: 'center', isBoundary: false });
                }
            }
        }

        // --- Active Object Edge Points (for resize, we care about the edges being resized) ---
        const activeXPoints = [
            { value: activeRect.left, type: 'edge' as const },
            { value: activeRect.left + activeRect.width / 2, type: 'center' as const },
            { value: activeRect.left + activeRect.width, type: 'edge' as const }
        ];

        const activeYPoints = [
            { value: activeRect.top, type: 'edge' as const },
            { value: activeRect.top + activeRect.height / 2, type: 'center' as const },
            { value: activeRect.top + activeRect.height, type: 'edge' as const }
        ];

        // --- Find Best Alignment (show guides without snapping during resize to avoid jumpiness) ---
        for (const target of verticalCandidates) {
            for (const source of activeXPoints) {
                const dist = Math.abs(target.value - source.value);
                const zone = this.getZone(dist, target.isBoundary);

                if (zone !== 'none') {
                    this.verticalLines.push({
                        x: target.value,
                        y1: -5000,
                        y2: 5000,
                        zone,
                        isBoundary: target.isBoundary
                    });
                    break; // Only show one guide per target
                }
            }
        }

        for (const target of horizontalCandidates) {
            for (const source of activeYPoints) {
                const dist = Math.abs(target.value - source.value);
                const zone = this.getZone(dist, target.isBoundary);

                if (zone !== 'none') {
                    this.horizontalLines.push({
                        y: target.value,
                        x1: -5000,
                        x2: 5000,
                        zone,
                        isBoundary: target.isBoundary
                    });
                    break; // Only show one guide per target
                }
            }
        }

        this.canvas.requestRenderAll();
    }

    private clearLines() {
        this.verticalLines = [];
        this.horizontalLines = [];
        this.distanceBadges = [];
        this.celebrationActive = false;
        this.canvas.requestRenderAll();
    }

    // --- Simplified Zone Detection (uses single Snap Distance setting) ---
    private getZone(distance: number, isBoundary: boolean = false): MagneticZone {
        // Snap Distance (default 5px) - AUTO-SNAP when within this distance
        const snapDistance = this.settings.magneticSnapThreshold || 5;

        // Boundaries get slightly larger detection zone
        const boundaryBonus = isBoundary ? 1.2 : 1;
        const adjustedSnapDistance = snapDistance * boundaryBonus;

        // Zone 3: LOCK - Within snap distance = INSTANT AUTO-SNAP to 0px
        if (distance <= adjustedSnapDistance) return 'lock';

        // Zone 2: Near (approaching snap zone) - visual feedback appears
        if (distance <= adjustedSnapDistance * 2) return 'near';

        // Zone 1: Far (informational) - faint guide lines
        if (distance <= adjustedSnapDistance * 3) return 'far';

        return 'none';
    }

    private getMagneticPull(zone: MagneticZone, distance: number): number {
        if (!this.settings.magneticSnapping) return 0;

        // Only snap in lock zone - no gradual pull to avoid vibration/jitter
        if (zone === 'lock') return distance;
        return 0;
    }

    // --- Visual Style by Zone ---
    private getLineStyle(zone: MagneticZone, isBoundary: boolean = false): { width: number; opacity: number; dashed: boolean } {
        const baseWidth = isBoundary ? 2 : 1;

        switch (zone) {
            case 'lock':
                return { width: baseWidth * 2.5, opacity: 1, dashed: false };
            case 'near':
                return { width: baseWidth * 1.5, opacity: 0.6, dashed: false };
            case 'far':
                return { width: baseWidth, opacity: 0.3, dashed: true };
            default:
                return { width: baseWidth, opacity: 0.2, dashed: true };
        }
    }

    private drawLines() {
        this.ctx.save();

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

        const scale = this.zoom || 1;
        const canvasWidth = this.canvas.width / scale;
        const canvasHeight = this.canvas.height / scale;

        // Draw grid overlay if enabled
        if (this.settings.gridSnapping && this.settings.showGridOverlay) {
            this.drawGrid(canvasWidth, canvasHeight, scale);
        }

        // Skip guide lines if disabled or nothing to draw
        if (!this.settings.showGuideLines) {
            this.ctx.restore();
            return;
        }
        if (!this.verticalLines.length && !this.horizontalLines.length && !this.distanceBadges.length) {
            this.ctx.restore();
            return;
        }

        // Draw vertical guide lines
        for (const v of this.verticalLines) {
            if (v.x === undefined) continue;
            const style = this.getLineStyle(v.zone, v.isBoundary);

            this.ctx.beginPath();
            this.ctx.strokeStyle = this.hexToRgba(this.settings.guideColor, style.opacity);
            this.ctx.lineWidth = style.width / Math.max(scale, 0.01);

            if (style.dashed) {
                this.ctx.setLineDash([6 / scale, 4 / scale]);
            } else {
                this.ctx.setLineDash([]);
            }

            this.ctx.moveTo(v.x, v.y1 || -5000);
            this.ctx.lineTo(v.x, v.y2 || 5000);
            this.ctx.stroke();

            // Glow effect for lock zone
            if (v.zone === 'lock' && this.settings.guideAnimations) {
                this.ctx.strokeStyle = this.hexToRgba(this.settings.guideColor, 0.3);
                this.ctx.lineWidth = (style.width * 3) / Math.max(scale, 0.01);
                this.ctx.stroke();
            }
        }

        // Draw horizontal guide lines
        for (const h of this.horizontalLines) {
            if (h.y === undefined) continue;
            const style = this.getLineStyle(h.zone, h.isBoundary);

            this.ctx.beginPath();
            this.ctx.strokeStyle = this.hexToRgba(this.settings.guideColor, style.opacity);
            this.ctx.lineWidth = style.width / Math.max(scale, 0.01);

            if (style.dashed) {
                this.ctx.setLineDash([6 / scale, 4 / scale]);
            } else {
                this.ctx.setLineDash([]);
            }

            this.ctx.moveTo(h.x1 || -5000, h.y);
            this.ctx.lineTo(h.x2 || 5000, h.y);
            this.ctx.stroke();

            // Glow effect for lock zone
            if (h.zone === 'lock' && this.settings.guideAnimations) {
                this.ctx.strokeStyle = this.hexToRgba(this.settings.guideColor, 0.3);
                this.ctx.lineWidth = (style.width * 3) / Math.max(scale, 0.01);
                this.ctx.stroke();
            }
        }

        // Draw distance badges
        if (this.settings.distanceIndicators) {
            for (const badge of this.distanceBadges) {
                this.drawBadge(badge.x, badge.y, badge.text, scale, badge.zone);
            }
        }

        // Draw celebration animation
        if (this.celebrationActive && this.settings.snapCelebrations) {
            this.drawCelebration(scale);
        }

        this.ctx.restore();
    }

    /**
     * Draw grid overlay on canvas
     */
    private drawGrid(canvasWidth: number, canvasHeight: number, scale: number) {
        const gridSize = this.settings.gridSize;
        if (gridSize <= 0) return;

        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        this.ctx.lineWidth = 0.5 / scale;
        this.ctx.setLineDash([2 / scale, 2 / scale]);

        // Draw vertical grid lines
        for (let x = gridSize; x < canvasWidth; x += gridSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, canvasHeight);
        }

        // Draw horizontal grid lines
        for (let y = gridSize; y < canvasHeight; y += gridSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(canvasWidth, y);
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    /**
     * Get grid visibility state
     */
    public getShowGrid(): boolean {
        return this.settings.showGridOverlay;
    }

    private drawBadge(x: number, y: number, text: string, scale: number, zone: MagneticZone) {
        // Badge size evolves with zone
        const sizeMultiplier = zone === 'lock' ? 1.3 : zone === 'near' ? 1.1 : 1;
        const paddingX = (6 / scale) * sizeMultiplier;
        const paddingY = (4 / scale) * sizeMultiplier;
        const fontSize = (12 / scale) * sizeMultiplier;

        this.ctx.font = `bold ${fontSize}px sans-serif`;
        const metrics = this.ctx.measureText(text);
        const width = metrics.width + (paddingX * 2);
        const height = fontSize + (paddingY * 2);

        // Background with zone-based opacity
        const bgOpacity = zone === 'lock' ? 1 : zone === 'near' ? 0.85 : 0.7;
        this.ctx.fillStyle = this.hexToRgba(this.settings.guideColor, bgOpacity);
        this.ctx.beginPath();

        const r = height / 2;
        const bx = x - width / 2;
        const by = y - height / 2;

        this.ctx.roundRect(bx, by, width, height, r);
        this.ctx.fill();

        // Glow for lock zone
        if (zone === 'lock' && this.settings.guideAnimations) {
            this.ctx.shadowColor = this.settings.guideColor;
            this.ctx.shadowBlur = 10 / scale;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        // Text
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Show checkmark for 0px (perfect alignment)
        const displayText = text === '0' && zone === 'lock' ? '✓' : text;
        this.ctx.fillText(displayText, x, y + (1 / scale));
    }

    private drawCelebration(scale: number) {
        const progress = this.celebrationProgress;
        const size = (20 / scale) * (1 + progress * 0.5);
        const opacity = 1 - progress;

        this.ctx.beginPath();
        this.ctx.arc(this.celebrationX, this.celebrationY, size, 0, Math.PI * 2);
        this.ctx.strokeStyle = this.hexToRgba(this.settings.guideColor, opacity * 0.5);
        this.ctx.lineWidth = 3 / scale;
        this.ctx.stroke();

        // Animate
        this.celebrationProgress += 0.1;
        if (this.celebrationProgress >= 1) {
            this.celebrationActive = false;
            this.celebrationProgress = 0;
        } else {
            requestAnimationFrame(() => this.canvas.requestRenderAll());
        }
    }

    private triggerCelebration(x: number, y: number) {
        if (!this.settings.snapCelebrations) return;
        this.celebrationActive = true;
        this.celebrationProgress = 0;
        this.celebrationX = x;
        this.celebrationY = y;
    }

    private hexToRgba(hex: string, alpha: number): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    private onObjectMoving(e: fabric.BasicTransformEvent<fabric.TPointerEvent> & { target: fabric.FabricObject }) {
        if (!this.enabled || this.isScaling) return;
        if (!this.settings.magneticSnapping && !this.settings.showGuideLines && !this.settings.gridSnapping) return;

        const activeObject = e.target;
        if (!activeObject) return;

        const canvasObjects = this.canvas.getObjects();
        const activeRect = activeObject.getBoundingRect();

        this.viewportTransform = this.canvas.viewportTransform;
        this.zoom = this.canvas.getZoom();

        const canvasWidth = this.canvas.width / this.zoom;
        const canvasHeight = this.canvas.height / this.zoom;

        this.clearLines();

        // --- Gather Snap Candidates ---
        interface SnapCandidate {
            value: number;
            type: 'edge' | 'center';
            isBoundary: boolean;
        }

        const verticalCandidates: SnapCandidate[] = [];
        const horizontalCandidates: SnapCandidate[] = [];

        // Canvas Center Lines - Use logical canvas dimensions
        if (this.settings.canvasCenterLines) {
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            verticalCandidates.push({ value: centerX, type: 'center', isBoundary: false });
            horizontalCandidates.push({ value: centerY, type: 'center', isBoundary: false });
        }

        // Canvas Boundaries
        if (this.settings.snapToBoundaries) {
            verticalCandidates.push({ value: 0, type: 'edge', isBoundary: true });
            verticalCandidates.push({ value: canvasWidth, type: 'edge', isBoundary: true });
            horizontalCandidates.push({ value: 0, type: 'edge', isBoundary: true });
            horizontalCandidates.push({ value: canvasHeight, type: 'edge', isBoundary: true });
        }

        // Other Objects
        if (this.settings.snapToObjects) {
            for (const obj of canvasObjects) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (obj === activeObject || !obj.visible || (obj as any).name?.includes('guide')) continue;

                const objRect = obj.getBoundingRect();

                if (this.settings.objectEdges) {
                    verticalCandidates.push(
                        { value: objRect.left, type: 'edge', isBoundary: false },
                        { value: objRect.left + objRect.width, type: 'edge', isBoundary: false }
                    );
                    horizontalCandidates.push(
                        { value: objRect.top, type: 'edge', isBoundary: false },
                        { value: objRect.top + objRect.height, type: 'edge', isBoundary: false }
                    );
                }

                if (this.settings.objectCenters) {
                    verticalCandidates.push({ value: objRect.left + objRect.width / 2, type: 'center', isBoundary: false });
                    horizontalCandidates.push({ value: objRect.top + objRect.height / 2, type: 'center', isBoundary: false });
                }
            }
        }

        // --- Active Object Points ---
        const activeXPoints = [
            { value: activeRect.left, type: 'edge' as const },
            { value: activeRect.left + activeRect.width / 2, type: 'center' as const },
            { value: activeRect.left + activeRect.width, type: 'edge' as const }
        ];

        const activeYPoints = [
            { value: activeRect.top, type: 'edge' as const },
            { value: activeRect.top + activeRect.height / 2, type: 'center' as const },
            { value: activeRect.top + activeRect.height, type: 'edge' as const }
        ];

        // --- Find Best Snaps (Non-Greedy with Zones) ---
        let bestSnapX: { diff: number; target: number; zone: MagneticZone; isBoundary: boolean } | null = null;
        let bestSnapY: { diff: number; target: number; zone: MagneticZone; isBoundary: boolean } | null = null;

        for (const target of verticalCandidates) {
            for (const source of activeXPoints) {
                const dist = Math.abs(target.value - source.value);
                const zone = this.getZone(dist, target.isBoundary);

                if (zone !== 'none') {
                    // Prioritize stronger zones
                    const currentPriority = this.getZonePriority(bestSnapX?.zone);
                    const newPriority = this.getZonePriority(zone);

                    if (newPriority > currentPriority || (newPriority === currentPriority && dist < Math.abs(bestSnapX?.diff || Infinity))) {
                        bestSnapX = {
                            diff: target.value - source.value,
                            target: target.value,
                            zone,
                            isBoundary: target.isBoundary
                        };
                    }
                }
            }
        }

        for (const target of horizontalCandidates) {
            for (const source of activeYPoints) {
                const dist = Math.abs(target.value - source.value);
                const zone = this.getZone(dist, target.isBoundary);

                if (zone !== 'none') {
                    const currentPriority = this.getZonePriority(bestSnapY?.zone);
                    const newPriority = this.getZonePriority(zone);

                    if (newPriority > currentPriority || (newPriority === currentPriority && dist < Math.abs(bestSnapY?.diff || Infinity))) {
                        bestSnapY = {
                            diff: target.value - source.value,
                            target: target.value,
                            zone,
                            isBoundary: target.isBoundary
                        };
                    }
                }
            }
        }

        // --- Grid Snapping ---
        if (this.settings.gridSnapping) {
            const gridSize = this.settings.gridSize;
            const threshold = this.settings.magneticSnapThreshold;
            const activeLeft = activeObject.left!;
            const activeTop = activeObject.top!;
            
            const snappedLeft = Math.round(activeLeft / gridSize) * gridSize;
            const snappedTop = Math.round(activeTop / gridSize) * gridSize;
            
            if (Math.abs(snappedLeft - activeLeft) <= threshold) {
                activeObject.set({ left: snappedLeft });
                // Add visual guide for grid snap
                this.verticalLines.push({
                    x: snappedLeft,
                    y1: -5000,
                    y2: 5000,
                    zone: 'lock',
                    isBoundary: false
                });
            }
            if (Math.abs(snappedTop - activeTop) <= threshold) {
                activeObject.set({ top: snappedTop });
                this.horizontalLines.push({
                    y: snappedTop,
                    x1: -5000,
                    x2: 5000,
                    zone: 'lock',
                    isBoundary: false
                });
            }
        }

        // --- Equal Spacing Detection ---
        const equalSpacing = this.computeEqualSpacing(activeRect, canvasObjects, activeObject);
        if (equalSpacing.snapX && !bestSnapX) {
            activeObject.set({ left: equalSpacing.snapX.target });
            activeObject.setCoords();
        }
        if (equalSpacing.snapY && !bestSnapY) {
            activeObject.set({ top: equalSpacing.snapY.target });
            activeObject.setCoords();
        }

        // --- Apply Object/Boundary Snaps ---
        let didSnapX = false;
        let didSnapY = false;

        if (bestSnapX && this.settings.magneticSnapping) {
            if (bestSnapX.zone === 'lock') {
                activeObject.set({ left: activeObject.left! + bestSnapX.diff });
                didSnapX = true;
            }
            // Show visual guide regardless of snap
            this.verticalLines.push({
                x: bestSnapX.target,
                y1: -5000,
                y2: 5000,
                zone: bestSnapX.zone,
                isBoundary: bestSnapX.isBoundary
            });
        }

        if (bestSnapY && this.settings.magneticSnapping) {
            if (bestSnapY.zone === 'lock') {
                activeObject.set({ top: activeObject.top! + bestSnapY.diff });
                didSnapY = true;
            }
            // Show visual guide regardless of snap
            this.horizontalLines.push({
                y: bestSnapY.target,
                x1: -5000,
                x2: 5000,
                zone: bestSnapY.zone,
                isBoundary: bestSnapY.isBoundary
            });
        }

        if (didSnapX || didSnapY) {
            activeObject.setCoords();
            if (didSnapX && didSnapY) {
                this.triggerCelebration(bestSnapX!.target, bestSnapY!.target);
            }
        }

        // --- Distance Measurements ---
        if (this.settings.distanceIndicators) {
            const updatedRect = activeObject.getBoundingRect();
            this.computeDistanceBadges(updatedRect, canvasObjects, activeObject);
        }

        // --- Prevent Off-Canvas ---
        if (this.settings.preventOffCanvas) {
            const updatedRect = activeObject.getBoundingRect();
            let clampNeeded = false;

            if (updatedRect.left < 0) {
                activeObject.set({ left: activeObject.left! - updatedRect.left });
                clampNeeded = true;
            }
            if (updatedRect.top < 0) {
                activeObject.set({ top: activeObject.top! - updatedRect.top });
                clampNeeded = true;
            }
            if (updatedRect.left + updatedRect.width > canvasWidth) {
                activeObject.set({ left: activeObject.left! - (updatedRect.left + updatedRect.width - canvasWidth) });
                clampNeeded = true;
            }
            if (updatedRect.top + updatedRect.height > canvasHeight) {
                activeObject.set({ top: activeObject.top! - (updatedRect.top + updatedRect.height - canvasHeight) });
                clampNeeded = true;
            }

            if (clampNeeded) activeObject.setCoords();
        }

        this.canvas.requestRenderAll();
    }

    private getZonePriority(zone: MagneticZone | undefined): number {
        if (!zone) return 0;
        switch (zone) {
            case 'lock': return 3;
            case 'near': return 2;
            case 'far': return 1;
            default: return 0;
        }
    }

    private computeDistanceBadges(
        activeRect: { left: number; top: number; width: number; height: number },
        canvasObjects: fabric.FabricObject[],
        activeObject: fabric.FabricObject
    ) {
        const measurementThreshold = 500 / this.zoom;

        for (const obj of canvasObjects) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (obj === activeObject || !obj.visible || (obj as any).name?.includes('guide')) continue;

            const targetRect = obj.getBoundingRect();

            // Vertical overlap check
            const verticalOverlap =
                Math.max(0, Math.min(activeRect.top + activeRect.height, targetRect.top + targetRect.height) -
                    Math.max(activeRect.top, targetRect.top)) > 0;

            if (verticalOverlap) {
                const distRightToLeft = targetRect.left - (activeRect.left + activeRect.width);
                if (distRightToLeft > 0 && distRightToLeft < measurementThreshold) {
                    const zone = this.getZone(distRightToLeft);
                    this.distanceBadges.push({
                        x: activeRect.left + activeRect.width + distRightToLeft / 2,
                        y: activeRect.top + activeRect.height / 2,
                        text: Math.round(distRightToLeft).toString(),
                        axis: 'x',
                        zone
                    });
                }

                const distLeftToRight = activeRect.left - (targetRect.left + targetRect.width);
                if (distLeftToRight > 0 && distLeftToRight < measurementThreshold) {
                    const zone = this.getZone(distLeftToRight);
                    this.distanceBadges.push({
                        x: targetRect.left + targetRect.width + distLeftToRight / 2,
                        y: activeRect.top + activeRect.height / 2,
                        text: Math.round(distLeftToRight).toString(),
                        axis: 'x',
                        zone
                    });
                }
            }

            // Horizontal overlap check
            const horizontalOverlap =
                Math.max(0, Math.min(activeRect.left + activeRect.width, targetRect.left + targetRect.width) -
                    Math.max(activeRect.left, targetRect.left)) > 0;

            if (horizontalOverlap) {
                const distBottomToTop = targetRect.top - (activeRect.top + activeRect.height);
                if (distBottomToTop > 0 && distBottomToTop < measurementThreshold) {
                    const zone = this.getZone(distBottomToTop);
                    this.distanceBadges.push({
                        x: activeRect.left + activeRect.width / 2,
                        y: activeRect.top + activeRect.height + distBottomToTop / 2,
                        text: Math.round(distBottomToTop).toString(),
                        axis: 'y',
                        zone
                    });
                }

                const distTopToBottom = activeRect.top - (targetRect.top + targetRect.height);
                if (distTopToBottom > 0 && distTopToBottom < measurementThreshold) {
                    const zone = this.getZone(distTopToBottom);
                    this.distanceBadges.push({
                        x: activeRect.left + activeRect.width / 2,
                        y: targetRect.top + targetRect.height + distTopToBottom / 2,
                        text: Math.round(distTopToBottom).toString(),
                        axis: 'y',
                        zone
                    });
                }
            }
        }
    }

    /**
     * Compute equal spacing guides
     * Detects when the active object's distance to neighbors matches
     * the spacing between other object pairs
     */
    private computeEqualSpacing(
        activeRect: { left: number; top: number; width: number; height: number },
        canvasObjects: fabric.FabricObject[],
        activeObject: fabric.FabricObject
    ): { snapX?: { target: number; spacing: number }; snapY?: { target: number; spacing: number } } {
        if (!this.settings.equalSpacing) return {};

        const threshold = this.settings.magneticSnapThreshold;
        const result: { snapX?: { target: number; spacing: number }; snapY?: { target: number; spacing: number } } = {};

        // Get all object rects excluding the active object
        const otherRects: { rect: { left: number; top: number; width: number; height: number }; obj: fabric.FabricObject }[] = [];
        for (const obj of canvasObjects) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (obj === activeObject || !obj.visible || (obj as any).name?.includes('guide')) continue;
            otherRects.push({ rect: obj.getBoundingRect(), obj });
        }

        if (otherRects.length < 2) return {};

        // Sort objects by position for spacing calculations
        const sortedByX = [...otherRects].sort((a, b) => a.rect.left - b.rect.left);
        const sortedByY = [...otherRects].sort((a, b) => a.rect.top - b.rect.top);

        // Find horizontal spacings between adjacent objects
        const horizontalSpacings: { spacing: number; left: number; right: number }[] = [];
        for (let i = 0; i < sortedByX.length - 1; i++) {
            const leftRect = sortedByX[i].rect;
            const rightRect = sortedByX[i + 1].rect;
            const spacing = rightRect.left - (leftRect.left + leftRect.width);
            if (spacing > 0 && spacing < 500) {
                horizontalSpacings.push({
                    spacing,
                    left: leftRect.left + leftRect.width,
                    right: rightRect.left
                });
            }
        }

        // Find vertical spacings between adjacent objects
        const verticalSpacings: { spacing: number; top: number; bottom: number }[] = [];
        for (let i = 0; i < sortedByY.length - 1; i++) {
            const topRect = sortedByY[i].rect;
            const bottomRect = sortedByY[i + 1].rect;
            const spacing = bottomRect.top - (topRect.top + topRect.height);
            if (spacing > 0 && spacing < 500) {
                verticalSpacings.push({
                    spacing,
                    top: topRect.top + topRect.height,
                    bottom: bottomRect.top
                });
            }
        }

        // Check if active object's spacing to neighbors matches existing spacings
        for (const other of otherRects) {
            const otherRect = other.rect;

            // Check horizontal (left/right) spacing
            // Active object to the left of other
            const spacingToRight = otherRect.left - (activeRect.left + activeRect.width);
            // Active object to the right of other
            const spacingToLeft = activeRect.left - (otherRect.left + otherRect.width);

            for (const hs of horizontalSpacings) {
                // Check if current spacing is close to an existing spacing
                if (spacingToRight > 0 && Math.abs(spacingToRight - hs.spacing) <= threshold * 2) {
                    const targetLeft = otherRect.left - hs.spacing - activeRect.width;
                    const diff = Math.abs(activeRect.left - targetLeft);
                    if (diff <= threshold) {
                        result.snapX = { target: targetLeft, spacing: hs.spacing };
                        // Add visual guide showing equal spacing
                        this.addEqualSpacingGuide('x', hs.spacing, activeRect, otherRect);
                    }
                }
                if (spacingToLeft > 0 && Math.abs(spacingToLeft - hs.spacing) <= threshold * 2) {
                    const targetLeft = otherRect.left + otherRect.width + hs.spacing;
                    const diff = Math.abs(activeRect.left - targetLeft);
                    if (diff <= threshold) {
                        result.snapX = { target: targetLeft, spacing: hs.spacing };
                        this.addEqualSpacingGuide('x', hs.spacing, activeRect, otherRect);
                    }
                }
            }

            // Check vertical (top/bottom) spacing
            const spacingBelow = otherRect.top - (activeRect.top + activeRect.height);
            const spacingAbove = activeRect.top - (otherRect.top + otherRect.height);

            for (const vs of verticalSpacings) {
                if (spacingBelow > 0 && Math.abs(spacingBelow - vs.spacing) <= threshold * 2) {
                    const targetTop = otherRect.top - vs.spacing - activeRect.height;
                    const diff = Math.abs(activeRect.top - targetTop);
                    if (diff <= threshold) {
                        result.snapY = { target: targetTop, spacing: vs.spacing };
                        this.addEqualSpacingGuide('y', vs.spacing, activeRect, otherRect);
                    }
                }
                if (spacingAbove > 0 && Math.abs(spacingAbove - vs.spacing) <= threshold * 2) {
                    const targetTop = otherRect.top + otherRect.height + vs.spacing;
                    const diff = Math.abs(activeRect.top - targetTop);
                    if (diff <= threshold) {
                        result.snapY = { target: targetTop, spacing: vs.spacing };
                        this.addEqualSpacingGuide('y', vs.spacing, activeRect, otherRect);
                    }
                }
            }
        }

        return result;
    }

    /**
     * Add visual guide lines for equal spacing
     */
    private addEqualSpacingGuide(
        axis: 'x' | 'y',
        spacing: number,
        activeRect: { left: number; top: number; width: number; height: number },
        otherRect: { left: number; top: number; width: number; height: number }
    ) {
        if (axis === 'x') {
            // Show equal spacing indicator between objects
            const midY = Math.max(activeRect.top, otherRect.top) + 
                Math.min(activeRect.height, otherRect.height) / 2;
            
            this.distanceBadges.push({
                x: (activeRect.left + activeRect.width + otherRect.left) / 2,
                y: midY,
                text: `=${Math.round(spacing)}`,
                axis: 'x',
                zone: 'lock'
            });
        } else {
            const midX = Math.max(activeRect.left, otherRect.left) + 
                Math.min(activeRect.width, otherRect.width) / 2;
            
            this.distanceBadges.push({
                x: midX,
                y: (activeRect.top + activeRect.height + otherRect.top) / 2,
                text: `=${Math.round(spacing)}`,
                axis: 'y',
                zone: 'lock'
            });
        }
    }
}
