import { Element } from '@/types/editor';

/**
 * Element Change Detection Utility
 * 
 * Differentiates between:
 * - List changes (additions, deletions, reordering) → requires replaceAllElements()
 * - Property changes (position, size, style) → requires updateElement()
 * 
 * This prevents excessive replaceAllElements() calls that interrupt user interactions.
 */

export interface ElementChangeResult {
    type: 'none' | 'list' | 'properties';
    added?: string[];
    removed?: string[];
    modified?: string[];
}

/**
 * Detect what type of change occurred between two element arrays
 */
export function detectElementChange(
    previous: Element[],
    current: Element[]
): ElementChangeResult {
    // Quick check: if arrays are the same reference, no change
    if (previous === current) {
        return { type: 'none' };
    }

    // Build ID maps for fast lookup
    const prevIds = new Set(previous.map(el => el.id));
    const currIds = new Set(current.map(el => el.id));

    // Detect additions and removals
    const added = current
        .filter(el => !prevIds.has(el.id))
        .map(el => el.id);

    const removed = previous
        .filter(el => !currIds.has(el.id))
        .map(el => el.id);

    // If there are additions or removals, it's a list change
    if (added.length > 0 || removed.length > 0) {
        return {
            type: 'list',
            added,
            removed
        };
    }

    // Check if order changed (also a list change)
    const orderChanged = current.some((el, i) => el.id !== previous[i]?.id);
    if (orderChanged) {
        return { type: 'list' };
    }

    // No list changes, check for property changes
    const modified: string[] = [];

    for (const currEl of current) {
        const prevEl = previous.find(el => el.id === currEl.id);
        if (!prevEl) continue;

        // Check if any properties changed
        if (hasPropertiesChanged(prevEl, currEl)) {
            modified.push(currEl.id);
        }
    }

    if (modified.length > 0) {
        return {
            type: 'properties',
            modified
        };
    }

    return { type: 'none' };
}

/**
 * Check if element properties changed (ignoring reference equality)
 */
function hasPropertiesChanged(prev: Element, curr: Element): boolean {
    // Critical properties that affect rendering
    const criticalProps: (keyof Element)[] = [
        'x', 'y', 'width', 'height', 'rotation',
        'opacity', 'visible', 'locked', 'zIndex'
    ];

    // Check critical props
    for (const prop of criticalProps) {
        if (prev[prop] !== curr[prop]) {
            return true;
        }
    }

    // Check type-specific properties
    if (prev.type === 'text' && curr.type === 'text') {
        if (prev.text !== curr.text ||
            prev.fontSize !== curr.fontSize ||
            prev.fontFamily !== curr.fontFamily ||
            prev.fill !== curr.fill) {
            return true;
        }
    }

    if (prev.type === 'shape' && curr.type === 'shape') {
        if (prev.fill !== curr.fill ||
            prev.stroke !== curr.stroke ||
            prev.strokeWidth !== curr.strokeWidth) {
            return true;
        }
    }

    // Note: ImageElement doesn't have mutable source - images are immutable once created

    return false;
}

/**
 * Create a stable hash of element IDs for quick comparison
 */
export function createElementHash(elements: Element[]): string {
    return elements.map(el => el.id).join(',');
}

/**
 * Check if change originated from canvas (to prevent sync loops)
 * 
 * Canvas-originated changes should NOT trigger React → Canvas sync
 * as the canvas already has the updated state.
 */
export function isCanvasOriginatedChange(
    previous: Element[],
    current: Element[],
    recentlyModifiedOnCanvas: Set<string>
): boolean {
    const change = detectElementChange(previous, current);

    if (change.type === 'properties' && change.modified) {
        // If only properties changed and all modified IDs are in the 
        // recently modified set, this change came from canvas
        return change.modified.every(id => recentlyModifiedOnCanvas.has(id));
    }

    return false;
}
