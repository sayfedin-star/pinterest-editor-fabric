import * as fabric from 'fabric';

/**
 * Configuration for Auto-Fit calculation
 */
interface AutoFitConfig {
    fontFamily: string;
    fontWeight: string | number;
    fontStyle: string;
    lineHeight: number;
    textAlign: string;
    charSpacing?: number;
    // Size constraints
    minFontSize: number;
    maxFontSize: number;
    // Soft preference (ignored if can't fit)
    maxLines?: number;
    
    // Style properties for accurate measurement
    paintFirst?: string;
    underline?: boolean;
    linethrough?: boolean;
    overline?: boolean;
    objectCaching?: boolean;
    
    // Context for server-side rendering (avoids DOM dependency)
    fabricContext?: any; 
}

/**
 * Guard flag to prevent re-entry during auto-fit calculation
 */
let _isAutoFitRunning = false;

/**
 * Calculates the optimal font size to fit text within a fixed bounding box.
 * Uses binary search to find the largest size that fits.
 * 
 * Algorithm:
 * - Pass 1: Find largest font where height fits AND lineCount <= maxLines
 * - Pass 2: If Pass 1 fails, find largest font where just height fits (ignore maxLines)
 * - Fallback: Use minFontSize (allow overflow for edge cases)
 * 
 * @param text The text to fit
 * @param targetWidth Fixed width of the bounding box
 * @param targetHeight Fixed height of the bounding box (HARD constraint)
 * @param config Text properties and constraints
 * @returns Optimal font size
 */
export function calculateBestFitFontSize(
    text: string,
    targetWidth: number,
    targetHeight: number,
    config: AutoFitConfig
): number {
    // 1. Sanity checks
    if (!text || targetWidth <= 0 || targetHeight <= 0) {
        return config.minFontSize;
    }

    // Determine Fabric implementation to use
    // On client: use imported 'fabric'
    // On server: use provided 'config.fabricContext'
    const fabricImpl = config.fabricContext || fabric;
    const TextboxClass = fabricImpl.Textbox;
    const ShadowClass = fabricImpl.Shadow;

    // SSR Check: If no custom context provided, and no DOM, abort
    if (!config.fabricContext && typeof document === 'undefined') {
        return config.minFontSize;
    }

    // 2. Create temporary textbox for measurement
    const tempText = new TextboxClass(text, {
        width: targetWidth,
        fontFamily: config.fontFamily,
        fontWeight: config.fontWeight,
        fontStyle: config.fontStyle as 'normal' | 'italic',
        lineHeight: config.lineHeight,
        textAlign: config.textAlign,
        charSpacing: config.charSpacing || 0,
        splitByGrapheme: false, // Word wrapping enabled
        
        // Style properties
        paintFirst: (config.paintFirst as 'fill' | 'stroke') || 'fill',
        underline: config.underline,
        linethrough: config.linethrough,
        overline: config.overline,
        objectCaching: config.objectCaching,
    });

    /**
     * Check if a font size fits within constraints
     */
    const checkFit = (fontSize: number, enforceMaxLines: boolean): boolean => {
        tempText.set({ fontSize });
        
        // Ensure dimensions are calculated
        if (typeof tempText.initDimensions === 'function') {
            tempText.initDimensions();
        }
        
        const textHeight = tempText.height || 0;
        
        // Access line count robustly (Fabric 6 uses .textLines)
        const lineCount = (tempText as any).textLines?.length || (tempText as any)._textLines?.length || 1;
        
        // Height is HARD constraint - must always be satisfied
        if (textHeight > targetHeight) {
            return false;
        }
        
        // MaxLines is SOFT constraint - only enforced when requested
        if (enforceMaxLines && config.maxLines !== undefined) {
            if (lineCount > config.maxLines) {
                return false;
            }
        }
        
        return true;
    };

    /**
     * Binary search for optimal font size
     */
    const binarySearch = (enforceMaxLines: boolean): number => {
        let low = config.minFontSize;
        let high = config.maxFontSize;
        let bestFit = 0;
        let iterations = 0;

        while (low <= high && iterations < 30) {
            const mid = Math.floor((low + high) / 2);
            
            if (checkFit(mid, enforceMaxLines)) {
                bestFit = mid; // This size fits, try larger
                low = mid + 1;
            } else {
                high = mid - 1; // Too big, try smaller
            }
            iterations++;
        }
        
        return bestFit;
    };

    // PASS 1: Try to satisfy BOTH height AND maxLines
    let result = binarySearch(true);
    
    // PASS 2: If Pass 1 failed AND maxLines was set, try again ignoring maxLines
    if (result === 0 && config.maxLines !== undefined) {
        result = binarySearch(false);
    }
    
    // FALLBACK: If still nothing fits, use minFontSize (allow overflow)
    if (result === 0) {
        result = config.minFontSize;
    }
    
    return result;
}

/**
 * Applies auto-fit to a Fabric Textbox.
 * 
 * IMPORTANT: This function expects the FIXED target dimensions,
 * not the auto-calculated dimensions from Fabric.
 * 
 * @param fabricObj The Fabric Textbox object
 * @param targetWidth Fixed width (from element.width)
 * @param targetHeight Fixed height (from element.height)
 * @param minSize Minimum font size (never goes below)
 * @param maxSize Maximum font size (starts searching from here)
 * @param maxLines Soft max lines preference
 * @returns The new fontSize if changed, null otherwise
 */
export function applyAutoFit(
    fabricObj: fabric.FabricObject,
    targetWidth: number,
    targetHeight: number,
    minSize: number = 10,
    maxSize: number = 500,
    maxLines?: number
): number | null {
    if (!(fabricObj instanceof fabric.Textbox)) return null;
    
    // Guard: prevent re-entry
    if (_isAutoFitRunning) {
        return null;
    }
    
    _isAutoFitRunning = true;
    
    try {
        const text = fabricObj.text || '';
        if (!text.trim()) return null;

        const newFontSize = calculateBestFitFontSize(text, targetWidth, targetHeight, {
            fontFamily: fabricObj.fontFamily || 'Arial',
            fontWeight: fabricObj.fontWeight || 'normal',
            fontStyle: fabricObj.fontStyle || 'normal',
            lineHeight: fabricObj.lineHeight || 1.2,
            textAlign: fabricObj.textAlign || 'left',
            charSpacing: fabricObj.charSpacing || 0,
            minFontSize: minSize,
            maxFontSize: maxSize,
            maxLines: maxLines,
            
            // Pass style properties
            paintFirst: fabricObj.paintFirst || 'fill',
            underline: fabricObj.underline,
            linethrough: fabricObj.linethrough,
            overline: fabricObj.overline,
            objectCaching: fabricObj.objectCaching,
        });

        const hasChanged = fabricObj.fontSize !== newFontSize;
        
        // ALWAYS apply layout changes to force visual refresh
        // Even if fontSize didn't change, we need to ensure width is correct
        fabricObj.set({
            fontSize: newFontSize,
            width: targetWidth,
            scaleX: 1,
            scaleY: 1,
        });
        
        // Force re-layout
        fabricObj.initDimensions();
        fabricObj.setCoords();
        
        // Force immediate render
        if (fabricObj.canvas) {
            fabricObj.canvas.requestRenderAll();
        }
        
        // Return the fontSize (even if unchanged) so store can sync
        // This ensures UI always shows current calculated value
        return hasChanged ? newFontSize : null;
    } finally {
        _isAutoFitRunning = false;
    }
}


