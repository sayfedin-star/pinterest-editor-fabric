/**
 * Font Loading Utilities
 *
 * Ensures fonts are properly loaded before rendering to prevent
 * font substitution issues in generated pins.
 *
 * Supports both Google Fonts (loaded via CSS) and custom fonts (loaded via FontFace API with URL).
 */

// Track fonts that have been validated as loaded
const loadedFontCache = new Set<string>();

// Track custom fonts that have been registered via FontFace
const registeredCustomFonts = new Map<string, string>(); // fontFamily -> fontUrl

/**
 * Load a custom font using the FontFace API
 * This is required for custom uploaded fonts that have a URL
 */
async function loadCustomFontFromUrl(
  fontFamily: string,
  fontUrl: string,
  timeout: number = 5000
): Promise<boolean> {
  // Skip if already registered
  if (registeredCustomFonts.has(fontFamily)) {
    return true;
  }

  if (typeof document === "undefined" || !("fonts" in document)) {
    return false;
  }

  try {
    console.log(`[FontLoader] Loading custom font via URL: ${fontFamily}`);

    // Create FontFace with the URL
    const fontFace = new FontFace(fontFamily, `url(${fontUrl})`);

    // Race with timeout
    const result = await Promise.race([
      fontFace.load(),
      new Promise<"timeout">((resolve) =>
        setTimeout(() => resolve("timeout"), timeout)
      ),
    ]);

    if (result === "timeout") {
      console.warn(`[FontLoader] Timeout loading custom font: ${fontFamily}`);
      return false;
    }

    // Add to document fonts
    document.fonts.add(fontFace);
    registeredCustomFonts.set(fontFamily, fontUrl);
    loadedFontCache.add(fontFamily);

    console.log(`[FontLoader] Successfully loaded custom font: ${fontFamily}`);
    return true;
  } catch (error) {
    console.warn(
      `[FontLoader] Failed to load custom font: ${fontFamily}`,
      error
    );
    return false;
  }
}

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
  const uncachedFonts = fontFamilies.filter((f) => !loadedFontCache.has(f));

  // Add cached fonts to loaded list
  fontFamilies.forEach((f) => {
    if (loadedFontCache.has(f)) {
      loaded.push(f);
    }
  });

  if (uncachedFonts.length === 0) {
    return { loaded, failed };
  }

  // Check if CSS Font Loading API is available
  if (typeof document === "undefined" || !("fonts" in document)) {
    // Fallback: assume fonts are loaded after a delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    uncachedFonts.forEach((f) => {
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
      const weights = ["400", "700", "900"];
      const loadAttempts = weights.map((weight) =>
        document.fonts.load(`${weight} 16px "${fontFamily}"`)
      );

      // Race with timeout
      const result = await Promise.race([
        Promise.all(loadAttempts),
        new Promise<"timeout">((resolve) =>
          setTimeout(() => resolve("timeout"), timeout)
        ),
      ]);

      if (result === "timeout") {
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

  if (typeof document === "undefined" || !("fonts" in document)) {
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
 * Font info with optional URL for custom fonts
 */
interface FontInfo {
  fontFamily: string;
  fontUrl?: string;
}

/**
 * Extract unique font families from template elements
 * Returns font info including URL for custom fonts
 */
export function extractFontsFromElements(
  elements: Array<{ type: string; fontFamily?: string }>
): string[] {
  const fonts = new Set<string>();

  elements.forEach((el) => {
    if (el.type === "text" && el.fontFamily) {
      fonts.add(el.fontFamily);
    }
  });

  return Array.from(fonts);
}

/**
 * Extract fonts with their URLs from template elements
 * This is needed for custom fonts that require FontFace loading
 */
export function extractFontsWithUrls(
  elements: Array<{ type: string; fontFamily?: string; fontUrl?: string }>
): FontInfo[] {
  const fontMap = new Map<string, FontInfo>();

  elements.forEach((el) => {
    if (el.type === "text" && el.fontFamily) {
      // Only add if not already in map, or if this one has a URL and existing doesn't
      const existing = fontMap.get(el.fontFamily);
      if (!existing || (el.fontUrl && !existing.fontUrl)) {
        fontMap.set(el.fontFamily, {
          fontFamily: el.fontFamily,
          fontUrl: el.fontUrl,
        });
      }
    }
  });

  return Array.from(fontMap.values());
}

/**
 * Preload fonts for a template before rendering
 * Handles both custom fonts (via URL) and Google Fonts (via CSS Font Loading API)
 */
export async function preloadTemplateFonts(
  elements: Array<{ type: string; fontFamily?: string; fontUrl?: string }>,
  timeout?: number
): Promise<{ loaded: string[]; failed: string[] }> {
  const fontInfos = extractFontsWithUrls(elements);

  if (fontInfos.length === 0) {
    return { loaded: [], failed: [] };
  }

  console.log(
    `[FontLoader] Preloading ${fontInfos.length} fonts:`,
    fontInfos.map((f) => f.fontFamily)
  );

  const loaded: string[] = [];
  const failed: string[] = [];

  // First, load any custom fonts that have URLs
  const customFonts = fontInfos.filter((f) => f.fontUrl);
  const googleFonts = fontInfos.filter((f) => !f.fontUrl);

  // Load custom fonts via FontFace API
  for (const fontInfo of customFonts) {
    const success = await loadCustomFontFromUrl(
      fontInfo.fontFamily,
      fontInfo.fontUrl!,
      timeout || 5000
    );
    if (success) {
      loaded.push(fontInfo.fontFamily);
    } else {
      failed.push(fontInfo.fontFamily);
    }
  }

  // Load remaining fonts (Google Fonts) via document.fonts.load
  if (googleFonts.length > 0) {
    const googleResult = await waitForFonts(
      googleFonts.map((f) => f.fontFamily),
      timeout
    );
    loaded.push(...googleResult.loaded);
    failed.push(...googleResult.failed);
  }

  if (failed.length > 0) {
    console.warn("[FontLoader] Some fonts failed to load:", failed);
  }

  return { loaded, failed };
}

/**
 * Clear the font cache (useful for testing)
 */
export function clearFontCache(): void {
  loadedFontCache.clear();
  // Note: We don't clear registeredCustomFonts because those FontFace objects
  // are already added to document.fonts and can't be easily removed
}
