/**
 * Character Styles Utility Module
 * 
 * Pure functions for manipulating character-level styles in rich text.
 * Used by the RichTextEditor component and ObjectFactory for canvas sync.
 * 
 * @module lib/text/characterStyles
 */

import { CharacterStyle, FabricTextStyles, TextSelection } from '@/types/editor';

// ============================================
// ID Generation
// ============================================

let styleIdCounter = 0;

/**
 * Generate a unique ID for a character style
 */
export function generateStyleId(): string {
    return `style-${Date.now()}-${++styleIdCounter}`;
}

// ============================================
// Selection Helpers
// ============================================

/**
 * Convert browser selection (exclusive end) to CharacterStyle range (inclusive end)
 * 
 * Browser selection API uses exclusive end: selectionStart=0, selectionEnd=5 means chars 0-4
 * CharacterStyle uses inclusive end: start=0, end=4 means chars 0-4
 * 
 * @param selection - TextSelection from browser
 * @returns Range with inclusive end for CharacterStyle operations
 */
export function selectionToRange(selection: TextSelection): { start: number; end: number } {
    return {
        start: selection.start,
        end: Math.max(selection.start, selection.end - 1),
    };
}

/**
 * Convert CharacterStyle range (inclusive end) to browser selection (exclusive end)
 */
export function rangeToSelection(range: { start: number; end: number }): TextSelection {
    return {
        start: range.start,
        end: range.end + 1,
        isCollapsed: range.start > range.end,
    };
}

// ============================================
// Style Application
// ============================================

/**
 * Apply style properties to a character range
 * 
 * Handles merging with existing styles:
 * - Splits existing styles that overlap with the new range
 * - Merges properties for overlapping regions
 * - Preserves non-overlapping portions of existing styles
 * 
 * @param existingStyles - Current character styles array
 * @param range - Range to apply style to (inclusive start and end)
 * @param styleProperties - Style properties to apply
 * @returns New character styles array with applied changes
 * 
 * @example
 * // Existing: [{ start: 0, end: 10, fill: 'red' }]
 * // Apply: { start: 5, end: 15, fontWeight: 700 }
 * // Result: [
 * //   { start: 0, end: 4, fill: 'red' },
 * //   { start: 5, end: 10, fill: 'red', fontWeight: 700 },
 * //   { start: 11, end: 15, fontWeight: 700 }
 * // ]
 */
export function applyStyleToRange(
    existingStyles: CharacterStyle[],
    range: { start: number; end: number },
    styleProperties: Partial<Omit<CharacterStyle, 'id' | 'start' | 'end'>>
): CharacterStyle[] {
    if (range.start > range.end) {
        console.warn('[characterStyles] Invalid range:', range);
        return existingStyles;
    }

    const result: CharacterStyle[] = [];
    const { start: rangeStart, end: rangeEnd } = range;

    // Process each existing style
    for (const style of existingStyles) {
        // Case 1: Style is completely before the range - keep as is
        if (style.end < rangeStart) {
            result.push({ ...style });
            continue;
        }

        // Case 2: Style is completely after the range - keep as is
        if (style.start > rangeEnd) {
            result.push({ ...style });
            continue;
        }

        // Case 3: Style overlaps with range - need to split/merge

        // Part before the range (if any)
        if (style.start < rangeStart) {
            result.push({
                ...style,
                id: generateStyleId(),
                end: rangeStart - 1,
            });
        }

        // Part after the range (if any)
        if (style.end > rangeEnd) {
            result.push({
                ...style,
                id: generateStyleId(),
                start: rangeEnd + 1,
            });
        }

        // Overlapping part - will be merged with new style later
        // We don't add it here, the new style will cover this range
    }

    // Create the new style for the range
    // First, collect all existing styles that overlap to merge their properties
    const overlappingStyles = existingStyles.filter(
        style => !(style.end < rangeStart || style.start > rangeEnd)
    );

    // Merge properties from overlapping styles
    const mergedProperties: Partial<CharacterStyle> = {};
    for (const style of overlappingStyles) {
        // Only merge the portion that actually overlaps
        if (style.fill) mergedProperties.fill = style.fill;
        if (style.fontWeight) mergedProperties.fontWeight = style.fontWeight;
        if (style.fontSize) mergedProperties.fontSize = style.fontSize;
        if (style.fontStyle) mergedProperties.fontStyle = style.fontStyle;
        if (style.textDecoration) mergedProperties.textDecoration = style.textDecoration;
        if (style.backgroundColor) mergedProperties.backgroundColor = style.backgroundColor;
    }

    // Apply new properties on top
    const newStyle: CharacterStyle = {
        id: generateStyleId(),
        start: rangeStart,
        end: rangeEnd,
        ...mergedProperties,
        ...styleProperties,
    };

    result.push(newStyle);

    // Sort by start position
    result.sort((a, b) => a.start - b.start);

    return optimizeStyles(result);
}

/**
 * Remove specific style properties from a range
 * 
 * @param existingStyles - Current character styles array
 * @param range - Range to remove properties from
 * @param propertyNames - Property names to remove
 * @returns New character styles array with properties removed
 */
export function removeStyleFromRange(
    existingStyles: CharacterStyle[],
    range: { start: number; end: number },
    propertyNames: Array<keyof Omit<CharacterStyle, 'id' | 'start' | 'end'>>
): CharacterStyle[] {
    if (range.start > range.end) {
        return existingStyles;
    }

    const result: CharacterStyle[] = [];
    const { start: rangeStart, end: rangeEnd } = range;

    for (const style of existingStyles) {
        // No overlap - keep as is
        if (style.end < rangeStart || style.start > rangeEnd) {
            result.push({ ...style });
            continue;
        }

        // Part before the range (keep all properties)
        if (style.start < rangeStart) {
            result.push({
                ...style,
                id: generateStyleId(),
                end: rangeStart - 1,
            });
        }

        // Overlapping part - remove specified properties
        const overlapStart = Math.max(style.start, rangeStart);
        const overlapEnd = Math.min(style.end, rangeEnd);

        const modifiedStyle: CharacterStyle = {
            ...style,
            id: generateStyleId(),
            start: overlapStart,
            end: overlapEnd,
        };

        // Remove specified properties
        for (const prop of propertyNames) {
            delete modifiedStyle[prop];
        }

        // Only add if there are remaining style properties
        if (hasStyleProperties(modifiedStyle)) {
            result.push(modifiedStyle);
        }

        // Part after the range (keep all properties)
        if (style.end > rangeEnd) {
            result.push({
                ...style,
                id: generateStyleId(),
                start: rangeEnd + 1,
            });
        }
    }

    result.sort((a, b) => a.start - b.start);
    return optimizeStyles(result);
}

/**
 * Check if a character style has any style properties (beyond id, start, end)
 */
function hasStyleProperties(style: CharacterStyle): boolean {
    return !!(
        style.fill ||
        style.fontWeight ||
        style.fontSize ||
        style.fontStyle ||
        style.textDecoration ||
        style.backgroundColor
    );
}

// ============================================
// Style Queries
// ============================================

/**
 * Get combined style properties for a range
 * Used to determine toolbar button states (is selection bold?)
 * 
 * Returns undefined for properties that vary within the range
 * 
 * @param characterStyles - Character styles array
 * @param range - Range to query
 * @returns Combined style properties for the range
 */
export function getStylesInRange(
    characterStyles: CharacterStyle[],
    range: { start: number; end: number }
): Partial<Omit<CharacterStyle, 'id' | 'start' | 'end'>> {
    if (range.start > range.end || characterStyles.length === 0) {
        return {};
    }

    const { start: rangeStart, end: rangeEnd } = range;

    // Find all styles affecting this range
    const affectingStyles = characterStyles.filter(
        style => !(style.end < rangeStart || style.start > rangeEnd)
    );

    if (affectingStyles.length === 0) {
        return {};
    }

    // Check if properties are consistent across all affecting styles
    const result: Partial<Omit<CharacterStyle, 'id' | 'start' | 'end'>> = {};

    // For each property, check if it's consistent
    const firstStyle = affectingStyles[0];

    // Fill
    const allFillsSame = affectingStyles.every(s => s.fill === firstStyle.fill);
    if (allFillsSame && firstStyle.fill) {
        result.fill = firstStyle.fill;
    }

    // Font weight
    const allWeightsSame = affectingStyles.every(s => s.fontWeight === firstStyle.fontWeight);
    if (allWeightsSame && firstStyle.fontWeight) {
        result.fontWeight = firstStyle.fontWeight;
    }

    // Font size
    const allSizesSame = affectingStyles.every(s => s.fontSize === firstStyle.fontSize);
    if (allSizesSame && firstStyle.fontSize) {
        result.fontSize = firstStyle.fontSize;
    }

    // Font style
    const allStylesSame = affectingStyles.every(s => s.fontStyle === firstStyle.fontStyle);
    if (allStylesSame && firstStyle.fontStyle) {
        result.fontStyle = firstStyle.fontStyle;
    }

    // Text decoration
    const allDecorationsSame = affectingStyles.every(s => s.textDecoration === firstStyle.textDecoration);
    if (allDecorationsSame && firstStyle.textDecoration) {
        result.textDecoration = firstStyle.textDecoration;
    }

    // Background color
    const allBgSame = affectingStyles.every(s => s.backgroundColor === firstStyle.backgroundColor);
    if (allBgSame && firstStyle.backgroundColor) {
        result.backgroundColor = firstStyle.backgroundColor;
    }

    return result;
}

/**
 * Check if a range has a specific style property value
 */
export function rangeHasStyle(
    characterStyles: CharacterStyle[],
    range: { start: number; end: number },
    property: keyof Omit<CharacterStyle, 'id' | 'start' | 'end'>,
    value: unknown
): boolean {
    const styles = getStylesInRange(characterStyles, range);
    return styles[property] === value;
}

/**
 * Style state: active (all chars have property), mixed (some), or inactive (none)
 */
export type StyleState = 'active' | 'mixed' | 'inactive';

/**
 * Get style states for a range - properly handles partial styles
 * 
 * Unlike getStylesInRange which only checks affecting styles,
 * this function checks EVERY character in the range to determine
 * if a property is fully applied, partially applied, or not applied.
 * 
 * @param characterStyles - Character styles array
 * @param range - Range to query
 * @returns Object with state for each style property
 */
export function getStyleStatesInRange(
    characterStyles: CharacterStyle[],
    range: { start: number; end: number }
): {
    fontWeight: StyleState;
    fontStyle: StyleState;
    textDecoration: StyleState;
    fill: StyleState;
    fontSize: StyleState;
    backgroundColor: StyleState;
} {
    const defaultResult = {
        fontWeight: 'inactive' as StyleState,
        fontStyle: 'inactive' as StyleState,
        textDecoration: 'inactive' as StyleState,
        fill: 'inactive' as StyleState,
        fontSize: 'inactive' as StyleState,
        backgroundColor: 'inactive' as StyleState,
    };
    
    if (range.start > range.end || range.start < 0) {
        return defaultResult;
    }
    
    const { start: rangeStart, end: rangeEnd } = range;
    const rangeLength = rangeEnd - rangeStart + 1;
    
    // Count how many characters have each property
    const counts = {
        fontWeight: 0,
        fontStyle: 0,
        textDecoration: 0,
        fill: 0,
        fontSize: 0,
        backgroundColor: 0,
    };
    
    // Check each character position
    for (let pos = rangeStart; pos <= rangeEnd; pos++) {
        // Find styles that affect this position
        for (const style of characterStyles) {
            if (pos >= style.start && pos <= style.end) {
                if (style.fontWeight) counts.fontWeight++;
                if (style.fontStyle && style.fontStyle !== 'normal') counts.fontStyle++;
                if (style.textDecoration && style.textDecoration !== 'none') counts.textDecoration++;
                if (style.fill) counts.fill++;
                if (style.fontSize) counts.fontSize++;
                if (style.backgroundColor) counts.backgroundColor++;
                break; // Only count first matching style per position
            }
        }
    }
    
    // Convert counts to states
    const toState = (count: number): StyleState => {
        if (count === 0) return 'inactive';
        if (count >= rangeLength) return 'active';
        return 'mixed';
    };
    
    return {
        fontWeight: toState(counts.fontWeight),
        fontStyle: toState(counts.fontStyle),
        textDecoration: toState(counts.textDecoration),
        fill: toState(counts.fill),
        fontSize: toState(counts.fontSize),
        backgroundColor: toState(counts.backgroundColor),
    };
}

// ============================================
// Performance Utilities
// ============================================

/**
 * Check if the character styles array is approaching performance limits
 * 
 * @param characterStyles - Styles to check
 * @returns Warning info if limits exceeded, null otherwise
 */
export function checkStylePerformance(
    characterStyles: CharacterStyle[]
): { warning: string; count: number; totalChars: number } | null {
    const MAX_STYLES = 500;
    const MAX_TOTAL_CHARS = 10000;
    
    const count = characterStyles.length;
    const totalChars = characterStyles.reduce(
        (sum, s) => sum + (s.end - s.start + 1), 0
    );
    
    if (count > MAX_STYLES) {
        return {
            warning: `High style count (${count} styles). Consider using fewer formatting changes.`,
            count,
            totalChars,
        };
    }
    
    if (totalChars > MAX_TOTAL_CHARS) {
        return {
            warning: `High styled character count (${totalChars} chars). Performance may be affected.`,
            count,
            totalChars,
        };
    }
    
    return null;
}

// ============================================
// Style Optimization
// ============================================

/**
 * Merge adjacent character styles with identical properties
 * 
 * This prevents style array bloat by combining consecutive styles
 * that have the same formatting.
 * 
 * @param characterStyles - Character styles array to optimize
 * @returns Optimized array with merged adjacent styles
 * 
 * @example
 * // Input: [
 * //   { start: 0, end: 4, fill: 'red' },
 * //   { start: 5, end: 10, fill: 'red' }  // Same style, adjacent
 * // ]
 * // Output: [{ start: 0, end: 10, fill: 'red' }]
 */
export function optimizeStyles(characterStyles: CharacterStyle[]): CharacterStyle[] {
    if (characterStyles.length <= 1) {
        return characterStyles;
    }

    // Sort by start position
    const sorted = [...characterStyles].sort((a, b) => a.start - b.start);
    const result: CharacterStyle[] = [];

    let current = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];

        // Check if styles can be merged (adjacent and same properties)
        if (current.end + 1 === next.start && stylesAreEqual(current, next)) {
            // Merge by extending current.end
            current.end = next.end;
        } else {
            result.push(current);
            current = { ...next };
        }
    }

    result.push(current);
    return result;
}

/**
 * Check if two styles have the same properties (excluding id, start, end)
 */
function stylesAreEqual(a: CharacterStyle, b: CharacterStyle): boolean {
    return (
        a.fill === b.fill &&
        a.fontWeight === b.fontWeight &&
        a.fontSize === b.fontSize &&
        a.fontStyle === b.fontStyle &&
        a.textDecoration === b.textDecoration &&
        a.backgroundColor === b.backgroundColor
    );
}

// ============================================
// Text Change Handling
// ============================================

/**
 * Adjust character style indices after text insertion or deletion
 * 
 * When text is inserted/deleted, styles need their indices updated:
 * - Styles after the change point are shifted
 * - Styles containing the change point may be split (deletion) or preserved (insertion)
 * 
 * For insertion, new characters do NOT inherit the style (conservative approach)
 * 
 * @param characterStyles - Current character styles
 * @param changePosition - Position where change occurred
 * @param changeLength - Positive for insertion, negative for deletion
 * @returns Updated character styles array
 * 
 * @example
 * // Text: "HELLO WORLD" → "HELLO BEAUTIFUL WORLD"
 * // Inserted "BEAUTIFUL " (10 chars) at position 6
 * // Style { start: 6, end: 10 } "WORLD" → { start: 16, end: 20 }
 */
export function adjustStylesAfterTextChange(
    characterStyles: CharacterStyle[],
    changePosition: number,
    changeLength: number
): CharacterStyle[] {
    if (changeLength === 0) {
        return characterStyles;
    }

    const result: CharacterStyle[] = [];

    for (const style of characterStyles) {
        if (changeLength > 0) {
            // INSERTION
            if (style.end < changePosition) {
                // Style is entirely before insertion - no change
                result.push({ ...style });
            } else if (style.start >= changePosition) {
                // Style is entirely after insertion - shift both indices
                result.push({
                    ...style,
                    start: style.start + changeLength,
                    end: style.end + changeLength,
                });
            } else {
                // Style spans the insertion point
                // Keep original range, don't expand to include inserted text
                // (Conservative approach: new text doesn't inherit style)
                result.push({
                    ...style,
                    // Part before insertion keeps its end at changePosition - 1
                    end: changePosition - 1,
                });
                // Part after insertion starts after the inserted text
                if (style.end >= changePosition) {
                    result.push({
                        ...style,
                        id: generateStyleId(),
                        start: changePosition + changeLength,
                        end: style.end + changeLength,
                    });
                }
            }
        } else {
            // DELETION (changeLength is negative)
            const deleteLength = Math.abs(changeLength);
            const deleteStart = changePosition;
            const deleteEnd = changePosition + deleteLength - 1;

            if (style.end < deleteStart) {
                // Case 1: Style is entirely BEFORE deletion - no change
                result.push({ ...style });
            } else if (style.start > deleteEnd) {
                // Case 2: Style is entirely AFTER deletion - shift backwards
                result.push({
                    ...style,
                    start: style.start - deleteLength,
                    end: style.end - deleteLength,
                });
            } else {
                // Case 3: Style OVERLAPS with deletion
                
                // Part before deletion (if any)
                if (style.start < deleteStart) {
                    result.push({
                        ...style,
                        id: generateStyleId(),
                        end: deleteStart - 1,
                    });
                }
                
                // Part after deletion (if any)
                if (style.end > deleteEnd) {
                    result.push({
                        ...style,
                        id: generateStyleId(),
                        start: deleteStart, // Collapsed to deletion point
                        end: style.end - deleteLength, // Shifted backwards
                    });
                }
                
                // The portion that was deleted is simply removed (no push)
            }
        }
    }

    // Remove any styles with invalid ranges (safety net)
    const validStyles = result.filter(s => s.start >= 0 && s.end >= s.start);

    return optimizeStyles(validStyles);
}

// ============================================
// Validation
// ============================================

/**
 * Validate and sanitize character styles array
 * 
 * Checks:
 * - start <= end
 * - indices within text length
 * - no negative indices
 * - valid property values
 * 
 * @param characterStyles - Styles to validate
 * @param textLength - Length of text to validate against
 * @returns Validation result with errors list
 */
export function validateCharacterStyles(
    characterStyles: CharacterStyle[],
    textLength: number
): { valid: boolean; errors: string[]; sanitized: CharacterStyle[] } {
    const errors: string[] = [];
    const sanitized: CharacterStyle[] = [];

    for (const style of characterStyles) {
        const styleErrors: string[] = [];

        // Check range validity
        if (style.start < 0) {
            styleErrors.push(`Style ${style.id}: start index is negative (${style.start})`);
        }
        if (style.end < 0) {
            styleErrors.push(`Style ${style.id}: end index is negative (${style.end})`);
        }
        if (style.start > style.end) {
            styleErrors.push(`Style ${style.id}: start (${style.start}) > end (${style.end})`);
        }
        if (style.end >= textLength) {
            styleErrors.push(`Style ${style.id}: end (${style.end}) exceeds text length (${textLength})`);
        }

        // Check property values
        if (style.fontWeight !== undefined) {
            const validWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
            if (!validWeights.includes(style.fontWeight)) {
                styleErrors.push(`Style ${style.id}: invalid fontWeight (${style.fontWeight})`);
            }
        }
        if (style.fontSize !== undefined && (style.fontSize < 1 || style.fontSize > 500)) {
            styleErrors.push(`Style ${style.id}: fontSize out of range (${style.fontSize})`);
        }

        if (styleErrors.length > 0) {
            errors.push(...styleErrors);
        } else {
            // Clamp indices to valid range
            sanitized.push({
                ...style,
                start: Math.max(0, Math.min(style.start, textLength - 1)),
                end: Math.max(0, Math.min(style.end, textLength - 1)),
            });
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        sanitized: optimizeStyles(sanitized),
    };
}

// ============================================
// Fabric.js Conversion
// ============================================

/**
 * Convert CharacterStyle[] to Fabric.js styles object
 * 
 * Fabric.js uses line-relative indices, so we need to:
 * 1. Split text into lines
 * 2. Calculate cumulative offsets for each line
 * 3. Map absolute indices to line-relative indices
 * 
 * @param text - The text content (may contain newlines)
 * @param characterStyles - Array of character styles with absolute indices
 * @param defaultStyles - Default styles to apply (used as fallback)
 * @returns Fabric.js styles object
 * 
 * @example
 * // Text: "HELLO\nWORLD" (11 chars)
 * // Style: [{ start: 0, end: 4, fill: 'red', fontWeight: 700 }] // "HELLO"
 * // Result: {
 * //   0: {
 * //     0: { fill: 'red', fontWeight: 700 },
 * //     1: { fill: 'red', fontWeight: 700 },
 * //     2: { fill: 'red', fontWeight: 700 },
 * //     3: { fill: 'red', fontWeight: 700 },
 * //     4: { fill: 'red', fontWeight: 700 }
 * //   }
 * // }
 */
export function convertToFabricStyles(
    text: string,
    characterStyles: CharacterStyle[]
): FabricTextStyles {
    const result: FabricTextStyles = {};
    
    if (!text || characterStyles.length === 0) {
        return result;
    }

    // Split text into lines and calculate line offsets
    const lines = text.split('\n');
    const lineOffsets: number[] = [];
    let offset = 0;

    for (const line of lines) {
        lineOffsets.push(offset);
        offset += line.length + 1; // +1 for the newline character
    }

    // For each character style, map to Fabric.js format
    for (const style of characterStyles) {
        // Iterate through each character in the style range
        for (let absIndex = style.start; absIndex <= style.end; absIndex++) {
            // Find which line this character is on
            let lineIndex = 0;
            for (let i = 0; i < lineOffsets.length; i++) {
                if (i === lineOffsets.length - 1 || lineOffsets[i + 1] > absIndex) {
                    lineIndex = i;
                    break;
                }
            }

            // Calculate character index within the line
            const charIndex = absIndex - lineOffsets[lineIndex];

            // Skip newline characters (they don't get styled)
            if (charIndex >= lines[lineIndex].length) {
                continue;
            }

            // Initialize line object if needed
            if (!result[lineIndex]) {
                result[lineIndex] = {};
            }

            // Convert our style format to Fabric.js format
            const fabricStyle: FabricTextStyles[number][number] = {};

            if (style.fill) {
                fabricStyle.fill = style.fill;
            }
            if (style.fontWeight) {
                fabricStyle.fontWeight = style.fontWeight;
            }
            if (style.fontSize) {
                fabricStyle.fontSize = style.fontSize;
            }
            if (style.fontStyle) {
                fabricStyle.fontStyle = style.fontStyle;
            }
            if (style.textDecoration) {
                fabricStyle.textDecoration = style.textDecoration;
            }
            if (style.backgroundColor) {
                fabricStyle.textBackgroundColor = style.backgroundColor;
            }

            // Merge with existing styles for this character (later styles win)
            result[lineIndex][charIndex] = {
                ...result[lineIndex][charIndex],
                ...fabricStyle,
            };
        }
    }

    return result;
}

/**
 * Convert Fabric.js styles object back to CharacterStyle[]
 * 
 * Used when extracting styles from canvas after direct text editing
 * 
 * @param text - The text content
 * @param fabricStyles - Fabric.js styles object
 * @returns Array of character styles with absolute indices
 */
export function convertFromFabricStyles(
    text: string,
    fabricStyles: FabricTextStyles
): CharacterStyle[] {
    const result: CharacterStyle[] = [];
    
    if (!text || !fabricStyles || Object.keys(fabricStyles).length === 0) {
        return result;
    }

    // Calculate line offsets
    const lines = text.split('\n');
    const lineOffsets: number[] = [];
    let offset = 0;

    for (const line of lines) {
        lineOffsets.push(offset);
        offset += line.length + 1;
    }

    // Build a map of absolute index -> style
    const styleMap = new Map<number, Partial<Omit<CharacterStyle, 'id' | 'start' | 'end'>>>();

    for (const lineIndexStr of Object.keys(fabricStyles)) {
        const lineIndex = parseInt(lineIndexStr, 10);
        const lineStyles = fabricStyles[lineIndex];

        for (const charIndexStr of Object.keys(lineStyles)) {
            const charIndex = parseInt(charIndexStr, 10);
            const absIndex = lineOffsets[lineIndex] + charIndex;
            const style = lineStyles[charIndex];

            styleMap.set(absIndex, {
                fill: style.fill as string | undefined,
                fontWeight: style.fontWeight as CharacterStyle['fontWeight'],
                fontSize: style.fontSize,
                fontStyle: style.fontStyle as CharacterStyle['fontStyle'],
                textDecoration: style.textDecoration as CharacterStyle['textDecoration'],
                backgroundColor: style.textBackgroundColor,
            });
        }
    }

    // Convert map to CharacterStyle[] by grouping consecutive same-styled chars
    if (styleMap.size === 0) {
        return result;
    }

    const sortedIndices = Array.from(styleMap.keys()).sort((a, b) => a - b);
    
    let currentStyle = styleMap.get(sortedIndices[0])!;
    let currentStart = sortedIndices[0];
    let currentEnd = sortedIndices[0];

    for (let i = 1; i < sortedIndices.length; i++) {
        const index = sortedIndices[i];
        const style = styleMap.get(index)!;

        // Check if this is consecutive and same style
        if (index === currentEnd + 1 && 
            stylesAreEqualPartial(currentStyle, style)) {
            currentEnd = index;
        } else {
            // Save current and start new
            if (hasPartialStyleProperties(currentStyle)) {
                result.push({
                    id: generateStyleId(),
                    start: currentStart,
                    end: currentEnd,
                    ...currentStyle,
                } as CharacterStyle);
            }
            currentStyle = style;
            currentStart = index;
            currentEnd = index;
        }
    }

    // Don't forget the last one
    if (hasPartialStyleProperties(currentStyle)) {
        result.push({
            id: generateStyleId(),
            start: currentStart,
            end: currentEnd,
            ...currentStyle,
        } as CharacterStyle);
    }

    return optimizeStyles(result);
}

/**
 * Check if two partial styles are equal
 */
function stylesAreEqualPartial(
    a: Partial<Omit<CharacterStyle, 'id' | 'start' | 'end'>>,
    b: Partial<Omit<CharacterStyle, 'id' | 'start' | 'end'>>
): boolean {
    return (
        a.fill === b.fill &&
        a.fontWeight === b.fontWeight &&
        a.fontSize === b.fontSize &&
        a.fontStyle === b.fontStyle &&
        a.textDecoration === b.textDecoration &&
        a.backgroundColor === b.backgroundColor
    );
}

/**
 * Check if a partial style has any properties
 */
function hasPartialStyleProperties(
    style: Partial<Omit<CharacterStyle, 'id' | 'start' | 'end'>>
): boolean {
    return !!(
        style.fill ||
        style.fontWeight ||
        style.fontSize ||
        style.fontStyle ||
        style.textDecoration ||
        style.backgroundColor
    );
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get the text snippet for a character style range
 */
export function getTextSnippet(text: string, style: CharacterStyle, maxLength = 20): string {
    const snippet = text.slice(style.start, style.end + 1);
    if (snippet.length > maxLength) {
        return snippet.slice(0, maxLength - 3) + '...';
    }
    return snippet;
}

/**
 * Create a new character style with default values
 */
export function createCharacterStyle(
    start: number,
    end: number,
    properties?: Partial<Omit<CharacterStyle, 'id' | 'start' | 'end'>>
): CharacterStyle {
    return {
        id: generateStyleId(),
        start,
        end,
        ...properties,
    };
}

/**
 * Check if character styles array exceeds performance limit
 */
export function isStyleCountExcessive(characterStyles: CharacterStyle[]): boolean {
    const MAX_STYLES = 1000;
    return characterStyles.length > MAX_STYLES;
}
