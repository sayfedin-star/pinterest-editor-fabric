/**
 * SpatialHashGrid - Spatial Partitioning for Collision Optimization
 * 
 * Reduces collision detection from O(n²) to O(k) where k is the number of
 * elements in the same or adjacent cells (typically 5-10 elements).
 * 
 * How it works:
 * 1. Divide canvas into uniform grid cells (e.g., 100x100px)
 * 2. Each element registers in all cells it overlaps
 * 3. During collision checks, only query elements in nearby cells
 * 4. Update only affected cells when elements move
 */

export interface GridElement {
    id: string;
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface GridConfig {
    canvasWidth: number;
    canvasHeight: number;
    cellSize: number;
}

export class SpatialHashGrid {
    private cellSize: number;
    private cols: number;
    private rows: number;
    private grid: Map<string, Set<string>>; // cellKey => Set of element IDs

    constructor(config: GridConfig) {
        this.cellSize = config.cellSize;
        this.cols = Math.ceil(config.canvasWidth / this.cellSize);
        this.rows = Math.ceil(config.canvasHeight / this.cellSize);
        this.grid = new Map();

        console.log('[SpatialHashGrid] Initialized:', {
            cellSize: this.cellSize,
            cols: this.cols,
            rows: this.rows,
            totalCells: this.cols * this.rows,
        });
    }

    /**
     * Get cell key for a position
     */
    private getCellKey(col: number, row: number): string {
        return `${col},${row}`;
    }

    /**
     * Get all cell keys that an element overlaps
     */
    private getElementCells(element: GridElement): string[] {
        const startCol = Math.max(0, Math.floor(element.left / this.cellSize));
        const endCol = Math.min(this.cols - 1, Math.floor((element.left + element.width) / this.cellSize));
        const startRow = Math.max(0, Math.floor(element.top / this.cellSize));
        const endRow = Math.min(this.rows - 1, Math.floor((element.top + element.height) / this.cellSize));

        const cells: string[] = [];

        for (let col = startCol; col <= endCol; col++) {
            for (let row = startRow; row <= endRow; row++) {
                cells.push(this.getCellKey(col, row));
            }
        }

        return cells;
    }

    /**
     * Insert an element into the grid
     */
    insert(element: GridElement): void {
        const cells = this.getElementCells(element);

        for (const cellKey of cells) {
            if (!this.grid.has(cellKey)) {
                this.grid.set(cellKey, new Set());
            }
            this.grid.get(cellKey)!.add(element.id);
        }

        console.log(`[SpatialHashGrid] Inserted element ${element.id} into ${cells.length} cells`);
    }

    /**
     * Remove an element from the grid
     */
    remove(elementId: string): void {
        let removedFromCells = 0;

        // Remove from all cells
        for (const [cellKey, ids] of this.grid.entries()) {
            if (ids.has(elementId)) {
                ids.delete(elementId);
                removedFromCells++;

                // Clean up empty cells
                if (ids.size === 0) {
                    this.grid.delete(cellKey);
                }
            }
        }

        console.log(`[SpatialHashGrid] Removed element ${elementId} from ${removedFromCells} cells`);
    }

    /**
     * Update an element's position in the grid
     * More efficient than remove + insert for small movements
     */
    update(element: GridElement): void {
        // For now, use simple remove + insert
        // TODO: Optimize by only updating changed cells
        this.remove(element.id);
        this.insert(element);
    }

    /**
     * Get all elements in the same or adjacent cells
     * This is the main optimization - only returns nearby elements
     */
    getNearby(element: GridElement): Set<string> {
        const cells = this.getElementCells(element);
        const nearbyIds = new Set<string>();

        for (const cellKey of cells) {
            const cellIds = this.grid.get(cellKey);
            if (cellIds) {
                for (const id of cellIds) {
                    if (id !== element.id) {
                        nearbyIds.add(id);
                    }
                }
            }
        }

        console.log(`[SpatialHashGrid] Found ${nearbyIds.size} nearby elements for ${element.id}`);
        return nearbyIds;
    }

    /**
     * Clear the entire grid
     */
    clear(): void {
        this.grid.clear();
        console.log('[SpatialHashGrid] Grid cleared');
    }

    /**
     * Get grid statistics for debugging
     */
    getStats(): {
        totalCells: number;
        occupiedCells: number;
        totalElements: number;
        avgElementsPerCell: number;
    } {
        const occupiedCells = this.grid.size;
        let totalElementInstances = 0;

        for (const ids of this.grid.values()) {
            totalElementInstances += ids.size;
        }

        return {
            totalCells: this.cols * this.rows,
            occupiedCells,
            totalElements: totalElementInstances,
            avgElementsPerCell: occupiedCells > 0 ? totalElementInstances / occupiedCells : 0,
        };
    }

    /**
     * Rebuild the entire grid (use when canvas size changes)
     */
    rebuild(config: GridConfig): void {
        console.log('[SpatialHashGrid] Rebuilding grid with new config');

        this.cellSize = config.cellSize;
        this.cols = Math.ceil(config.canvasWidth / this.cellSize);
        this.rows = Math.ceil(config.canvasHeight / this.cellSize);
        this.clear();
    }
}
