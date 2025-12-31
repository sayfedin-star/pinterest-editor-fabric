```typescript
import * as fabric from 'fabric';

/**
 * Configuration for Auto-Fit calculation
 */
interface AutoFitConfig {
    fontFamily: string;
    fontWeight: string | number;
    fontStyle: string;
    lineHeight: number;
    fill: string; // Needed for completeness, though doesn't affect layout much
    textAlign: string;
    minFontSize: number;
    maxFontSize: number;
    wordWrap: boolean; // Usually true for Textbox
    maxLines?: number; // Optional maximum number of lines
}

/**
 * Robustly calculates the optimal font size to fit text within constraints.
 * Uses binary search to find the largest size that fits.
 * 
 * @param text The text to fit
 * @param width Target width constraint
 * @param height Target height constraint
 * @param config Text properties
 * @returns Optimimal font size
 */
export function calculateBestFitFontSize(
    text: string,
    width: number,
    height: number,
    config: AutoFitConfig
): number {
    // 1. Sanity checks
    if (!text || width <= 0 || height <= 0) return config.minFontSize;

    // SSR Check: Fabric Textbox needs DOM (document) for measurement
    if (typeof document === 'undefined') {
        return config.minFontSize;
    }

    // 2. Setup binary search range
    let min = config.minFontSize;
    let max = config.maxFontSize;
    let optimal = min;

    // 3. Create a lightweight temporary static canvas for measurement
    const tempText = new fabric.Textbox(text, {
        width: width,
        fontFamily: config.fontFamily,
        fontWeight: config.fontWeight,
        fontStyle: config.fontStyle as 'normal' | 'italic',
        lineHeight: config.lineHeight,
        textAlign: config.textAlign,
        splitByGrapheme: !config.wordWrap,
    });

    // Helper to check if size fits
    const fits = (size: number): boolean => {
        tempText.set({ fontSize: size });
        
        if (typeof tempText.initDimensions === 'function') {
            tempText.initDimensions();
        }
        
        const calculatedHeight = tempText.height || 0;
        const heightFits = calculatedHeight <= height + 1;

        if (config.maxLines !== undefined) {
            const lineCount = (tempText as any)._textLines?.length || 0;
            if (lineCount > config.maxLines) {
                return false;
            }
        }
        
        return heightFits;
    };

    // 4. Binary Search
    let iterations = 0;
    while (min <= max && iterations < 20) {
        const mid = Math.floor((min + max) / 2);
        
        if (fits(mid)) {
            optimal = mid;
            min = mid + 1;
        } else {
            max = mid - 1;
        }
        iterations++;
    }

    // Return 0 if the best found fit still exceeds maxLines
    if (!fits(optimal)) {
        return 0;
    }

    return optimal;
}

/**
 * Applies auto-fit to a given Fabric object if enabled.
 * Modifies the object in place.
 */
export function applyAutoFit(
    fabricObj: fabric.FabricObject, 
    minSize: number = 8, 
    maxSize: number = 500
): void {
    if (!(fabricObj instanceof fabric.Textbox)) return;
    
    const maxWidth = fabricObj.getScaledWidth();
    const maxHeight = fabricObj.getScaledHeight();
    
    const newFontSize = calculateBestFitFontSize(fabricObj.text || '', maxWidth, maxHeight, {
        fontFamily: fabricObj.fontFamily || 'Arial',
        fontWeight: fabricObj.fontWeight || 'normal',
        fontStyle: fabricObj.fontStyle || 'normal',
        lineHeight: fabricObj.lineHeight || 1.2,
        fill: (fabricObj.fill as string),
        textAlign: fabricObj.textAlign || 'left',
        minFontSize: minSize,
        maxFontSize: maxSize,
        wordWrap: true
    });

    // Apply
    fabricObj.set({
        fontSize: newFontSize || minSize,
        scaleX: 1,
        scaleY: 1,
        width: maxWidth
    });
    
    fabricObj.initDimensions();
}
```
