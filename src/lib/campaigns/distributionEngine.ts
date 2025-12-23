/**
 * Distribution Engine for Multi-Template Campaigns
 * 
 * Determines which template to use for each CSV row based on the selected
 * distribution mode: sequential, random, equal split, or CSV column.
 */

import { TemplateSnapshot, DistributionMode } from '@/types/database.types';

// ============================================
// Types
// ============================================

export interface DistributionContext {
    templates: TemplateSnapshot[];
    mode: DistributionMode;
    totalRows: number;
    /** Random seed for reproducible results (optional) */
    seed?: number;
}

export interface RowContext {
    rowIndex: number;
    csvRow: Record<string, unknown>;
}

export interface DistributionResult {
    template: TemplateSnapshot;
    templateIndex: number;
    /** Warning message if fallback was used */
    warning?: string;
}

// ============================================
// Seeded Random Number Generator
// ============================================

/**
 * Simple seeded PRNG (Linear Congruential Generator)
 * Allows reproducible random sequences for testing
 */
function seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

// Store random generator per session for consistent results within a campaign
let sessionRandom: (() => number) | null = null;

/**
 * Initialize or reset the random generator for a campaign session
 */
export function initializeDistributionSession(seed?: number): void {
    sessionRandom = seededRandom(seed ?? Date.now());
}

/**
 * Reset the distribution session (call between campaigns)
 */
export function resetDistributionSession(): void {
    sessionRandom = null;
}

// ============================================
// Distribution Algorithms
// ============================================

/**
 * Sequential distribution: cycles through templates in order
 * Row 0 → Template A, Row 1 → Template B, Row 2 → Template A, ...
 */
function getSequentialTemplate(
    rowIndex: number,
    templates: TemplateSnapshot[]
): DistributionResult {
    const templateIndex = rowIndex % templates.length;
    return {
        template: templates[templateIndex],
        templateIndex,
    };
}

/**
 * Random distribution: randomly assigns each row to a template
 */
function getRandomTemplate(
    templates: TemplateSnapshot[]
): DistributionResult {
    // Initialize session random if not already done
    if (!sessionRandom) {
        sessionRandom = seededRandom(Date.now());
    }
    
    const templateIndex = Math.floor(sessionRandom() * templates.length);
    return {
        template: templates[templateIndex],
        templateIndex,
    };
}

/**
 * Equal split distribution: divides rows into equal chunks per template
 * With 100 rows and 2 templates: rows 0-49 → Template A, rows 50-99 → Template B
 */
function getEqualSplitTemplate(
    rowIndex: number,
    templates: TemplateSnapshot[],
    totalRows: number
): DistributionResult {
    const chunkSize = Math.ceil(totalRows / templates.length);
    let templateIndex = Math.floor(rowIndex / chunkSize);
    
    // Clamp to valid range (handles remainder rows)
    templateIndex = Math.min(templateIndex, templates.length - 1);
    
    return {
        template: templates[templateIndex],
        templateIndex,
    };
}

/**
 * CSV column distribution: uses a "template" column in the CSV to select template
 * Matches by template short_id or name (case-insensitive)
 */
function getCsvColumnTemplate(
    csvRow: Record<string, unknown>,
    templates: TemplateSnapshot[]
): DistributionResult {
    // Look for template identifier in CSV row
    const templateValue = (
        csvRow['template'] ?? 
        csvRow['Template'] ?? 
        csvRow['TEMPLATE'] ??
        csvRow['template_id'] ??
        csvRow['templateId']
    ) as string | undefined;

    if (!templateValue) {
        // No template column found, fall back to first template
        return {
            template: templates[0],
            templateIndex: 0,
            warning: 'No "template" column found in CSV row, using first template',
        };
    }

    const searchValue = String(templateValue).trim().toLowerCase();

    // Try to match by short_id first (exact match)
    let matchIndex = templates.findIndex(
        t => t.short_id?.toLowerCase() === searchValue
    );

    // If no match by short_id, try matching by name
    if (matchIndex === -1) {
        matchIndex = templates.findIndex(
            t => t.name.toLowerCase() === searchValue
        );
    }

    // If still no match, try partial name match
    if (matchIndex === -1) {
        matchIndex = templates.findIndex(
            t => t.name.toLowerCase().includes(searchValue)
        );
    }

    if (matchIndex === -1) {
        // No match found, fall back to first template
        return {
            template: templates[0],
            templateIndex: 0,
            warning: `Template "${templateValue}" not found, using first template`,
        };
    }

    return {
        template: templates[matchIndex],
        templateIndex: matchIndex,
    };
}

// ============================================
// Main Distribution Function
// ============================================

/**
 * Get the template to use for a specific CSV row
 * 
 * @param context - Distribution configuration (templates, mode, totalRows)
 * @param row - The specific row being processed
 * @returns The template to use and its index
 * 
 * @example
 * ```ts
 * const context = {
 *   templates: [templateA, templateB],
 *   mode: 'sequential',
 *   totalRows: 100,
 * };
 * 
 * const result = getTemplateForRow(context, { rowIndex: 0, csvRow: {} });
 * // result.template === templateA (first in sequence)
 * 
 * const result2 = getTemplateForRow(context, { rowIndex: 1, csvRow: {} });
 * // result2.template === templateB (second in sequence)
 * ```
 */
export function getTemplateForRow(
    context: DistributionContext,
    row: RowContext
): DistributionResult {
    const { templates, mode, totalRows } = context;
    const { rowIndex, csvRow } = row;

    // Edge case: no templates
    if (!templates || templates.length === 0) {
        throw new Error('At least one template is required for distribution');
    }

    // Edge case: single template - always return it
    if (templates.length === 1) {
        return {
            template: templates[0],
            templateIndex: 0,
        };
    }

    switch (mode) {
        case 'sequential':
            return getSequentialTemplate(rowIndex, templates);
        
        case 'random':
            return getRandomTemplate(templates);
        
        case 'equal':
            return getEqualSplitTemplate(rowIndex, templates, totalRows);
        
        case 'csv_column':
            return getCsvColumnTemplate(csvRow, templates);
        
        default:
            // Fallback to sequential for unknown modes
            console.warn(`Unknown distribution mode: ${mode}, falling back to sequential`);
            return getSequentialTemplate(rowIndex, templates);
    }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Preview the distribution for a campaign
 * Useful for showing users how templates will be distributed
 * 
 * @param context - Distribution configuration
 * @param sampleSize - Number of rows to preview (default: first 10)
 * @returns Array of template assignments for preview
 */
export function previewDistribution(
    context: DistributionContext,
    sampleSize: number = 10
): { rowIndex: number; templateName: string; templateIndex: number }[] {
    const preview: { rowIndex: number; templateName: string; templateIndex: number }[] = [];
    const rowsToPreview = Math.min(sampleSize, context.totalRows);

    // Use a fresh random session for preview
    const originalRandom = sessionRandom;
    if (context.mode === 'random') {
        initializeDistributionSession(12345); // Fixed seed for consistent preview
    }

    for (let i = 0; i < rowsToPreview; i++) {
        const result = getTemplateForRow(context, { rowIndex: i, csvRow: {} });
        preview.push({
            rowIndex: i,
            templateName: result.template.name,
            templateIndex: result.templateIndex,
        });
    }

    // Restore original random session
    sessionRandom = originalRandom;

    return preview;
}

/**
 * Calculate the expected distribution counts for each template
 * 
 * @param context - Distribution configuration
 * @returns Record mapping template ID to expected row count
 */
export function calculateDistributionCounts(
    context: DistributionContext
): Record<string, number> {
    const { templates, mode, totalRows } = context;
    const counts: Record<string, number> = {};

    // Initialize all templates to 0
    templates.forEach(t => {
        counts[t.id] = 0;
    });

    switch (mode) {
        case 'sequential':
            // Each template gets roughly equal count
            const baseCount = Math.floor(totalRows / templates.length);
            const remainder = totalRows % templates.length;
            templates.forEach((t, i) => {
                counts[t.id] = baseCount + (i < remainder ? 1 : 0);
            });
            break;

        case 'random':
            // Approximately equal distribution (probabilistic)
            const avgCount = totalRows / templates.length;
            templates.forEach(t => {
                counts[t.id] = Math.round(avgCount);
            });
            break;

        case 'equal':
            // Equal split chunks
            const chunkSize = Math.ceil(totalRows / templates.length);
            let remaining = totalRows;
            templates.forEach((t, i) => {
                const isLast = i === templates.length - 1;
                counts[t.id] = isLast ? remaining : Math.min(chunkSize, remaining);
                remaining -= counts[t.id];
            });
            break;

        case 'csv_column':
            // Can't predict - depends on CSV data
            templates.forEach(t => {
                counts[t.id] = -1; // -1 indicates "unknown"
            });
            break;
    }

    return counts;
}
