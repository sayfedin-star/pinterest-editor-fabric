/**
 * Extract dynamic data summary from template elements
 * Used for filtering and displaying element composition
 */
import { Element } from '@/types/editor';

/**
 * Summary of dynamic (editable) elements in a template
 */
export interface DynamicDataSummary {
    images: number;     // Count of dynamic image elements
    texts: number;      // Count of dynamic text elements
    total: number;      // Total dynamic elements
}

/**
 * Extract dynamic data counts from template elements
 * Only counts elements marked as isDynamic=true
 * 
 * @param elements - Array of template elements
 * @returns Summary of dynamic element counts
 */
export function extractDynamicData(elements: Element[]): DynamicDataSummary {
    if (!elements || !Array.isArray(elements)) {
        return { images: 0, texts: 0, total: 0 };
    }

    let images = 0;
    let texts = 0;

    for (const element of elements) {
        // Check if element is dynamic
        if ('isDynamic' in element && element.isDynamic) {
            if (element.type === 'image') {
                images++;
            } else if (element.type === 'text') {
                texts++;
            }
        }
    }

    return {
        images,
        texts,
        total: images + texts,
    };
}

/**
 * Format dynamic data for display
 * @param summary - Dynamic data summary
 * @returns Formatted string like "2 images • 1 text"
 */
export function formatDynamicData(summary: DynamicDataSummary): string {
    const parts: string[] = [];
    
    if (summary.images > 0) {
        parts.push(`${summary.images} image${summary.images !== 1 ? 's' : ''}`);
    }
    
    if (summary.texts > 0) {
        parts.push(`${summary.texts} text${summary.texts !== 1 ? 's' : ''}`);
    }
    
    if (parts.length === 0) {
        return 'No dynamic fields';
    }
    
    return parts.join(' • ');
}

/**
 * Check if template matches dynamic data filter criteria
 * @param summary - Template's dynamic data summary
 * @param filter - Filter criteria
 * @returns true if template matches filter
 */
export interface DynamicDataFilter {
    images?: number;
    texts?: number;
    logic: 'exactly' | 'at_least' | 'at_most';
}

export function matchesDynamicDataFilter(
    summary: DynamicDataSummary,
    filter: DynamicDataFilter
): boolean {
    const { logic } = filter;
    
    // Check images if specified
    if (filter.images !== undefined) {
        const matches = checkCount(summary.images, filter.images, logic);
        if (!matches) return false;
    }
    
    // Check texts if specified
    if (filter.texts !== undefined) {
        const matches = checkCount(summary.texts, filter.texts, logic);
        if (!matches) return false;
    }
    
    return true;
}

function checkCount(
    actual: number,
    expected: number,
    logic: 'exactly' | 'at_least' | 'at_most'
): boolean {
    switch (logic) {
        case 'exactly':
            return actual === expected;
        case 'at_least':
            return actual >= expected;
        case 'at_most':
            return actual <= expected;
        default:
            return true;
    }
}
