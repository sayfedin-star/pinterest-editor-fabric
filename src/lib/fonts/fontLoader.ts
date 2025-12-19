/**
 * Font Loading Utilities
 * 
 * Ensures fonts are properly loaded before rendering to prevent
 * font substitution issues in generated pins.
 */

// Track fonts that have been validated as loaded
const loadedFontCache = new Set<string>();

/**
 * Wait for specific font families to be loaded
 * Uses the CSS Font Loading API with fallback
 * 
 * @param fontFamilies - Array of font family names to wait for
 * @param timeout - Maximum time to wait in ms (default: 3000)
 * @returns Promise that resolves when fonts are ready or timeout
 */
export async function waitForFonts(
    fontFamilies: string[],
    timeout: number = 3000
): Promise<{ loaded: string[]; failed: string[] }> {
    const loaded: string[] = [];
    const failed: string[] = [];

    // Filter out already cached fonts
    const uncachedFonts = fontFamilies.filter(f => !loadedFontCache.has(f));
    
    // Add cached fonts to loaded list
    fontFamilies.forEach(f => {
        if (loadedFontCache.has(f)) {
            loaded.push(f);
        }
    });

    if (uncachedFonts.length === 0) {
        return { loaded, failed };
    }

    // Check if CSS Font Loading API is available
    if (typeof document === 'undefined' || !('fonts' in document)) {
        // Fallback: assume fonts are loaded after a delay
        await new Promise(resolve => setTimeout(resolve, 100));
        uncachedFonts.forEach(f => {
            loaded.push(f);
            loadedFontCache.add(f);
        });
        return { loaded, failed };
    }

    // Wait for document fonts to be ready first
    await document.fonts.ready;

    // Try to load each font with timeout
    const loadPromises = uncachedFonts.map(async (fontFamily) => {
        try {
            // Load common weights for the font
            const weights = ['400', '700', '900'];
            const loadAttempts = weights.map(weight => 
                document.fonts.load(`${weight} 16px "${fontFamily}"`)
            );

            // Race with timeout
            const result = await Promise.race([
                Promise.all(loadAttempts),
                new Promise<'timeout'>((resolve) => 
                    setTimeout(() => resolve('timeout'), timeout)
                ),
            ]);

            if (result === 'timeout') {
                console.warn(`[FontLoader] Timeout loading font: ${fontFamily}`);
                failed.push(fontFamily);
            } else {
                loaded.push(fontFamily);
                loadedFontCache.add(fontFamily);
            }
        } catch (error) {
            console.warn(`[FontLoader] Failed to load font: ${fontFamily}`, error);
            failed.push(fontFamily);
        }
    });

    await Promise.all(loadPromises);
    
    return { loaded, failed };
}

/**
 * Check if a font is available (loaded and ready)
 */
export function isFontLoaded(fontFamily: string): boolean {
    if (loadedFontCache.has(fontFamily)) {
        return true;
    }

    if (typeof document === 'undefined' || !('fonts' in document)) {
        return false;
    }

    // Check if any variant of the font is loaded
    const isLoaded = document.fonts.check(`16px "${fontFamily}"`);
    if (isLoaded) {
        loadedFontCache.add(fontFamily);
    }
    
    return isLoaded;
}

/**
 * Extract unique font families from template elements
 */
export function extractFontsFromElements(
    elements: Array<{ type: string; fontFamily?: string }>
): string[] {
    const fonts = new Set<string>();
    
    elements.forEach(el => {
        if (el.type === 'text' && el.fontFamily) {
            fonts.add(el.fontFamily);
        }
    });
    
    return Array.from(fonts);
}

/**
 * Preload fonts for a template before rendering
 * Combines extraction and waiting
 */
export async function preloadTemplateFonts(
    elements: Array<{ type: string; fontFamily?: string }>,
    timeout?: number
): Promise<{ loaded: string[]; failed: string[] }> {
    const fonts = extractFontsFromElements(elements);
    
    if (fonts.length === 0) {
        return { loaded: [], failed: [] };
    }
    
    console.log(`[FontLoader] Preloading ${fonts.length} fonts:`, fonts);
    const result = await waitForFonts(fonts, timeout);
    
    if (result.failed.length > 0) {
        console.warn('[FontLoader] Some fonts failed to load:', result.failed);
    }
    
    return result;
}

/**
 * Clear the font cache (useful for testing)
 */
export function clearFontCache(): void {
    loadedFontCache.clear();
}
