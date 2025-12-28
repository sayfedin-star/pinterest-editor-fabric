import { TextElement, AutoFitConfig } from '@/types/editor';

/**
 * Shared Text Processing Logic
 * Used by both Client (ObjectFactory) and Server (serverEngine)
 * to ensure identical rendering results.
 */

// --- 1. Dynamic Field Replacement ---

export interface FieldMapping {
    [templateField: string]: string;
}

export function replaceDynamicFields(
    text: string, 
    rowData: Record<string, string>, 
    fieldMapping: FieldMapping
): string {
    if (!text) return '';
    
    let result = text;
    const matches = text.match(/\{\{([^}]+)\}\}/g);
    
    if (matches) {
        matches.forEach((match) => {
            const fieldName = match.replace(/\{\{|\}\}/g, '').trim();
            // Try mapped column first, then direct field name
            const val = rowData[fieldMapping[fieldName]] || rowData[fieldName];
            
            if (val !== undefined) {
                result = result.replace(match, val);
            } else {
                // If no data found, replace with empty string or keep tag? 
                // Currently keeping empty string to clean up
                result = result.replace(match, '');
            }
        });
    }
    return result;
}

// --- 2. Text Transformation ---

export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

export function applyTextTransform(
    text: string,
    transform: TextTransform | undefined
): string {
    if (!text || !transform || transform === 'none') return text;
    
    switch (transform) {
        case 'uppercase':
            return text.toUpperCase();
        case 'lowercase':
            return text.toLowerCase();
        case 'capitalize':
            return text.replace(/\b\w/g, (char) => char.toUpperCase());
        default:
            return text;
    }
}

// --- 3. Font Size Calculation (Auto-Fit) ---

// Interface for the measurement function (platform specific)
// Client uses canvas context or hidden DOM element
// Server uses fabric.node Textbox or node-canvas measureText
export type TextMeasureFn = (fontSize: number, text: string, fontFamily: string, fontWeight: string | number) => { width: number, height: number };

export function calculateAutoFitFontSize(
    text: string,
    config: AutoFitConfig,
    measureFn: TextMeasureFn,
    fontFamily: string,
    fontWeight: string | number
): number {
    const { 
        containerWidth, 
        containerHeight, 
        minFontSize = 8, 
        maxFontSize = 200, 
        padding = 0 
    } = config;

    const availWidth = containerWidth - (padding * 2);
    const availHeight = containerHeight - (padding * 2);

    let low = minFontSize;
    let high = maxFontSize;
    let bestFit = minFontSize;

    // Binary search for optimal size
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const dim = measureFn(mid, text, fontFamily, fontWeight);

        if (dim.width <= availWidth && dim.height <= availHeight) {
            bestFit = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    return bestFit;
}
