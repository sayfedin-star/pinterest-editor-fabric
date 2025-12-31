I will update `src/lib/canvas/AutoFitText.ts` to include `stroke`, `strokeWidth`, and `paintFirst` in the `AutoFitConfig` and the temporary `fabric.Textbox` used for measurement. This ensures the wrapping calculation accounts for stroke dimensions, mirroring the actual object's behavior and resolving the line count discrepancy.

I have analyzed the issue and identified that the `calculateBestFitFontSize` function uses a temporary `fabric.Textbox` (`tempText`) that lacks the `stroke`, `strokeWidth`, and `paintFirst` properties of the actual object. In Fabric.js, `strokeWidth` increases the object's dimensions and can affect text wrapping, causing the discrepancy where the calculated size fits in N lines but the real object (with stroke) requires N+1 lines.

Here is the **FIXED** code for `src/lib/canvas/AutoFitText.ts`. It updates `AutoFitConfig` to include these properties and ensures `tempText` mirrors the real object's configuration.

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
    charSpacing?: number;
    // Added properties to match render context and ensure accurate wrapping
    stroke?: string | null;
    strokeWidth?: number;
    paintFirst?: 'fill' | 'stroke';
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

    // 3. Create a lightweight temporary static canvas for measurement
    // CRITICAL FIX: Include stroke properties and paintFirst as they affect wrapping and dimensions
    const tempText = new fabric.Textbox(text, {
        width: width,
        fontFamily: config.fontFamily,
        fontWeight: config.fontWeight,
        fontStyle: config.fontStyle as 'normal' | 'italic',
        lineHeight: config.lineHeight,
        textAlign: config.textAlign,
        splitByGrapheme: !config.wordWrap,
        charSpacing: config.charSpacing || 0,
        stroke: config.stroke,
        strokeWidth: config.strokeWidth || 0,
        paintFirst: config.paintFirst || 'fill',
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
             // Access internal textLines if public property is missing or for robustness in older versions
             // In Fabric 6, .textLines is standard for Textbox
            const lineCount = (tempText as any).textLines?.length || (tempText as any)._textLines?.length || 0;
            if (lineCount > config.maxLines) {
                return false;
            }
        }
        
        return heightFits;
    };

    // 4. Binary Search Helper
    const runBinarySearch = (lower: number, upper: number): number => {
        let min = lower;
        let max = upper;
        let optimal = 0; // Starts at 0, meaning 'not found' in this range
        let iterations = 0;

        while (min <= max && iterations < 20) {
            const mid = Math.floor((min + max) / 2);
            if (mid <= 0) { // Safety check
                min = mid + 1;
                continue;
            }
            
            if (fits(mid)) {
                optimal = mid;
                min = mid + 1;
            } else {
                max = mid - 1;
            }
            iterations++;
        }
        return optimal;
    };

    // Pass 1: Try to fit within user constraints [minFontSize, maxFontSize]
    let bestFit = runBinarySearch(config.minFontSize, config.maxFontSize);

    // Pass 2: If Pass 1 failed (returned 0) AND maxLines is set, 
    // it implies we couldn't fit even at minFontSize due to line constraints.
    // We STRICTLY respect maxLines, so we try smaller sizes [1, minFontSize - 1].
    if (bestFit === 0 && config.maxLines) {
        // Only try if there's room below minFontSize
        if (config.minFontSize > 1) {
            bestFit = runBinarySearch(1, config.minFontSize - 1);
        }
    }

    // If we found a fit in either pass, return it.
    if (bestFit > 0) return bestFit;

    // Use fallback if absolutely nothing fits (return minFontSize or 0?)
    // Returning minFontSize preserves old behavior when constraints are impossible
    return config.minFontSize;
}

/**
 * Applies auto-fit to a given Fabric object if enabled.
 * Modifies the object in place.
 */
export function applyAutoFit(
    fabricObj: fabric.FabricObject, 
    minSize: number = 8, 
    maxSize: number = 500,
    maxLines?: number
): void {
    if (!(fabricObj instanceof fabric.Textbox)) return;
    
    const maxWidth = fabricObj.getScaledWidth();
    const maxHeight = fabricObj.getScaledHeight();
    
    // @ts-ignore - charSpacing exists on Textbox
    const charSpacing = (fabricObj as any).charSpacing || 0;

    const newFontSize = calculateBestFitFontSize(fabricObj.text || '', maxWidth, maxHeight, {
        fontFamily: fabricObj.fontFamily || 'Arial',
        fontWeight: fabricObj.fontWeight || 'normal',
        fontStyle: fabricObj.fontStyle || 'normal',
        lineHeight: fabricObj.lineHeight || 1.2,
        fill: (fabricObj.fill as string),
        textAlign: fabricObj.textAlign || 'left',
        minFontSize: minSize,
        maxFontSize: maxSize,
        wordWrap: true,
        maxLines: maxLines,
        charSpacing: charSpacing,
        // Pass stroke properties to ensure accurate wrapping calculation
        stroke: (fabricObj.stroke as string),
        strokeWidth: fabricObj.strokeWidth || 0,
        paintFirst: fabricObj.paintFirst
    });

    // Apply
    fabricObj.set({
        fontSize: newFontSize,
        scaleX: 1,
        scaleY: 1,
        width: maxWidth
    });
    
    fabricObj.initDimensions();
}
```
