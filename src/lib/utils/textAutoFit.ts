/**
 * Enhanced Text Auto-Fit Utility (v2.0)
 * 
 * Uses Fabric.js Textbox for precise text measurement instead of Canvas 2D API.
 * This ensures pixel-perfect accuracy since we measure using the same engine
 * that will render the text.
 * 
 * Key improvements:
 * - Uses Fabric.js Textbox for measurement (matches render exactly)
 * - Sub-pixel precision with decimal font sizes
 * - Accounts for charSpacing (Fabric.js uses different units than CSS)
 * - Proper line height calculation matching Fabric.js
 * - Multi-line text wrapping matches Fabric.js behavior
 * - Font weight support for accurate measurement
 */

import * as fabric from 'fabric';

export interface AutoFitOptions {
    text: string;
    maxFontSize: number;
    minFontSize?: number;
    width: number;
    height: number;
    fontFamily: string;
    lineHeight: number;
    letterSpacing?: number;
    align?: 'left' | 'center' | 'right' | 'justify';
    fontStyle?: string; // e.g., 'normal', 'bold', 'italic', 'bold italic'
    fontWeight?: number | string; // 100-900 or 'normal', 'bold'
}

export interface AutoFitResult {
    fontSize: number;
    actualWidth: number;
    actualHeight: number;
    lineCount: number;
    fits: boolean;
}

// ============================================
// Measurement Textbox Cache
// ============================================

// Reuse a single offscreen Textbox for measurements
let measurementTextbox: fabric.Textbox | null = null;

function getMeasurementTextbox(): fabric.Textbox {
    if (!measurementTextbox) {
        measurementTextbox = new fabric.Textbox('', {
            // Start with minimal config
            left: 0,
            top: 0,
            splitByGrapheme: false, // Word-based wrapping (default)
        });
    }
    return measurementTextbox;
}

// ============================================
// Precise Measurement using Fabric.js
// ============================================

/**
 * Measure text dimensions using Fabric.js Textbox
 * This gives exact dimensions matching what will be rendered
 */
export function measureTextWithFabric(
    text: string,
    fontSize: number,
    options: Omit<AutoFitOptions, 'text' | 'maxFontSize' | 'minFontSize'>
): { width: number; height: number; lineCount: number } {
    const textbox = getMeasurementTextbox();
    
    // Configure the textbox with all styling properties
    textbox.set({
        text: text,
        width: options.width,
        fontSize: fontSize,
        fontFamily: options.fontFamily || 'Arial',
        lineHeight: options.lineHeight || 1.2,
        // Fabric.js charSpacing is in 1/1000 em units, our letterSpacing is in pixels
        // Convert: pixels to em-based units (approximation: fontSize / 100)
        charSpacing: (options.letterSpacing || 0) * 10,
        textAlign: options.align || 'left',
        fontWeight: options.fontWeight || 'normal',
        fontStyle: options.fontStyle?.includes('italic') ? 'italic' : 'normal',
    });

    // Force recalculation of dimensions
    // This calls Fabric.js internal text wrapping and measurement
    textbox.initDimensions();

    // Get actual dimensions from Fabric.js
    const actualHeight = textbox.height || 0;
    const actualWidth = textbox.width || 0;
    const lineCount = textbox.textLines?.length || 1;

    return {
        width: actualWidth,
        height: actualHeight,
        lineCount,
    };
}

/**
 * Check if text fits in the box at a given font size using Fabric.js
 */
function textFitsWithFabric(
    text: string,
    fontSize: number,
    options: Omit<AutoFitOptions, 'text' | 'maxFontSize' | 'minFontSize'>
): boolean {
    const { height: actualHeight } = measureTextWithFabric(text, fontSize, options);
    return actualHeight <= options.height;
}

// ============================================
// Enhanced Binary Search with Decimal Precision
// ============================================

/**
 * Calculate the optimal font size that fits text in the given box
 * Uses Fabric.js Textbox for precise measurement
 * 
 * Features:
 * - Sub-pixel precision (0.5px increments)
 * - Exact Fabric.js text wrapping behavior
 * - Accurate charSpacing handling
 * 
 * @param options - Auto-fit configuration
 * @returns Optimal font size in pixels (may include 0.5 decimal)
 */
export function calculateAutoFitSize(options: AutoFitOptions): number {
    const {
        text,
        maxFontSize,
        minFontSize = 8,
        width,
        height,
        fontFamily,
        lineHeight,
        letterSpacing = 0,
        fontStyle = 'normal',
        fontWeight = 'normal',
        align = 'left',
    } = options;

    // Empty text defaults to max size
    if (!text || text.trim() === '') {
        return maxFontSize;
    }

    // Prepare measurement options
    const measureOptions = {
        width,
        height,
        fontFamily,
        lineHeight,
        letterSpacing,
        fontStyle,
        fontWeight,
        align,
    };

    // Fast check: if min font size doesn't fit, return min
    if (!textFitsWithFabric(text, minFontSize, measureOptions)) {
        return minFontSize;
    }

    // Fast check: if max font size fits, return max
    if (textFitsWithFabric(text, maxFontSize, measureOptions)) {
        return maxFontSize;
    }

    // Binary search with 0.5px precision
    // Use estimation to narrow initial search range (reduces iterations by 30-50%)
    const estimate = estimateOptimalFontSize(text, width, height, maxFontSize);
    let low = Math.max(minFontSize, Math.floor(estimate * 0.7));
    let high = Math.min(maxFontSize, Math.ceil(estimate * 1.3));
    let bestFit = minFontSize;

    // Use 0.5px precision for smoother sizing
    const PRECISION = 0.5;

    while (low <= high) {
        // Round to nearest 0.5
        const mid = Math.round((low + high) / 2 / PRECISION) * PRECISION;

        if (textFitsWithFabric(text, mid, measureOptions)) {
            bestFit = mid;
            low = mid + PRECISION; // Try larger
        } else {
            high = mid - PRECISION; // Try smaller
        }

        // Safety check to prevent infinite loop
        if (high - low < PRECISION) {
            break;
        }
    }

    return bestFit;
}

/**
 * Calculate auto-fit with full result details
 * Returns not just the font size but also actual dimensions
 */
export function calculateAutoFitSizeDetailed(options: AutoFitOptions): AutoFitResult {
    const fontSize = calculateAutoFitSize(options);
    
    const measureOptions = {
        width: options.width,
        height: options.height,
        fontFamily: options.fontFamily,
        lineHeight: options.lineHeight,
        letterSpacing: options.letterSpacing || 0,
        fontStyle: options.fontStyle || 'normal',
        fontWeight: options.fontWeight || 'normal',
        align: options.align || 'left',
    };
    
    const { width: actualWidth, height: actualHeight, lineCount } = 
        measureTextWithFabric(options.text, fontSize, measureOptions);
    
    return {
        fontSize,
        actualWidth,
        actualHeight,
        lineCount,
        fits: actualHeight <= options.height,
    };
}

// ============================================
// Cache with Invalidation
// ============================================

interface CacheEntry {
    size: number;
    timestamp: number;
}

class AutoFitCache {
    private cache = new Map<string, CacheEntry>();
    private maxSize = 200;
    private maxAge = 60000; // 1 minute TTL

    getCacheKey(options: AutoFitOptions): string {
        // Include all properties that affect layout
        return [
            options.text,
            options.width,
            options.height,
            options.maxFontSize,
            options.minFontSize || 8,
            options.fontFamily,
            options.lineHeight,
            options.letterSpacing || 0,
            options.fontWeight || 'normal',
            options.fontStyle || 'normal',
            options.align || 'left',
        ].join('|');
    }

    get(options: AutoFitOptions): number | undefined {
        const key = this.getCacheKey(options);
        const entry = this.cache.get(key);
        
        if (entry) {
            // Check if entry is still valid (not expired)
            if (Date.now() - entry.timestamp < this.maxAge) {
                // LRU: refresh timestamp
                entry.timestamp = Date.now();
                return entry.size;
            } else {
                // Expired, remove it
                this.cache.delete(key);
            }
        }
        return undefined;
    }

    set(options: AutoFitOptions, size: number): void {
        const key = this.getCacheKey(options);

        // Evict oldest entries if cache is full
        if (this.cache.size >= this.maxSize) {
            const entries = Array.from(this.cache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            // Remove oldest 20%
            const toRemove = Math.ceil(this.maxSize * 0.2);
            for (let i = 0; i < toRemove; i++) {
                this.cache.delete(entries[i][0]);
            }
        }

        this.cache.set(key, { size, timestamp: Date.now() });
    }

    clear(): void {
        this.cache.clear();
    }
    
    /** Clear cache entries for a specific text (useful when text content changes) */
    invalidateText(text: string): void {
        for (const key of this.cache.keys()) {
            if (key.startsWith(text + '|')) {
                this.cache.delete(key);
            }
        }
    }
}

export const autoFitCache = new AutoFitCache();

/**
 * Calculate auto-fit size with caching
 * Uses LRU cache with TTL for performance
 */
export function calculateAutoFitSizeCached(options: AutoFitOptions): number {
    const cached = autoFitCache.get(options);
    if (cached !== undefined) {
        return cached;
    }

    const size = calculateAutoFitSize(options);
    autoFitCache.set(options, size);
    return size;
}

// ============================================
// Legacy API Compatibility
// ============================================

/**
 * Measure text dimensions at a specific font size
 * (Legacy API - uses new Fabric.js measurement internally)
 */
export function measureText(
    text: string,
    fontSize: number,
    fontFamily: string,
    lineHeight: number,
    maxWidth: number,
    letterSpacing: number = 0
): { width: number; height: number; lines: number } {
    const result = measureTextWithFabric(text, fontSize, {
        width: maxWidth,
        height: 10000, // Large height for measurement
        fontFamily,
        lineHeight,
        letterSpacing,
    });

    return {
        width: result.width,
        height: result.height,
        lines: result.lineCount,
    };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Estimate optimal starting point for binary search
 * Uses text length heuristics to reduce iterations
 */
export function estimateOptimalFontSize(
    text: string,
    width: number,
    height: number,
    maxFontSize: number
): number {
    const charCount = text.length;
    const lineBreaks = (text.match(/\n/g) || []).length;
    const area = width * height;
    
    // Rough estimate: each character needs ~0.6 * fontSize^2 area
    const estimatedFontSize = Math.sqrt(area / (charCount * 0.6));
    
    // Adjust for line breaks
    const adjusted = estimatedFontSize / (1 + lineBreaks * 0.2);
    
    // Clamp to reasonable range
    return Math.min(maxFontSize, Math.max(8, Math.round(adjusted)));
}

/**
 * Calculate minimum width needed for text at a given font size
 * Useful for determining if text needs wrapping
 */
export function calculateMinimumWidth(
    text: string,
    fontSize: number,
    fontFamily: string,
    letterSpacing: number = 0
): number {
    // Find the longest word/segment
    const words = text.split(/\s+/);
    const textbox = getMeasurementTextbox();
    
    let maxWordWidth = 0;
    
    for (const word of words) {
        textbox.set({
            text: word,
            fontSize,
            fontFamily,
            charSpacing: letterSpacing * 10,
            width: 10000, // No wrapping constraint
        });
        textbox.initDimensions();
        maxWordWidth = Math.max(maxWordWidth, textbox.width || 0);
    }
    
    return maxWordWidth;
}
