'use client';

import { useState, useCallback, useRef } from 'react';
import { Element, CanvasSize, ImageElement } from '@/types/editor';
import { renderTemplate, exportToBlob, FieldMapping } from '@/lib/fabric/engine';
import { getCanvasPool } from '@/lib/canvas/CanvasPool';
import { getTemplateForRow } from '@/lib/campaigns/distributionEngine';
import { DistributionMode } from '@/types/database.types';

// ============================================
// Types
// ============================================

export interface ValidationWarning {
    type: 'text_truncation' | 'empty_field' | 'image_loading' | 'font_missing';
    message: string;
    severity: 'info' | 'warning' | 'error';
}

export interface PreviewPin {
    rowIndex: number;
    imageDataUrl: string;
    csvRowData: Record<string, string>;
    validationWarnings: ValidationWarning[];
    generationTimeMs: number;
    status: 'pending' | 'generating' | 'completed' | 'failed';
    error?: string;
    templateId?: string; // NEW: Which template was used for this pin
    templateName?: string; // NEW: Template name for display
}

// NEW: Template data for multi-template mode
export interface TemplateData {
    id: string;
    name: string;
    elements: Element[];
    canvasSize: CanvasSize;
    backgroundColor: string;
}

export interface UsePreviewGenerationProps {
    /** CSV data rows */
    csvRows: Record<string, string>[];
    /** Template elements to render (single template mode) */
    templateElements: Element[];
    /** Canvas size for the template */
    canvasSize: CanvasSize;
    /** Background color for the canvas */
    backgroundColor: string;
    /** Field mapping from template fields to CSV columns */
    fieldMapping: Record<string, string>;
    /** Number of preview pins to generate (default: 5) */
    previewCount?: number;
    // NEW: Multi-template support
    /** Array of templates for multi-template mode */
    templates?: TemplateData[];
    /** Distribution mode for multi-template */
    distributionMode?: DistributionMode;
}

export interface UsePreviewGenerationResult {
    /** Generated preview pins */
    previewPins: PreviewPin[];
    /** Whether preview generation is in progress */
    isGenerating: boolean;
    /** Overall error message if generation failed */
    error: string | null;
    /** Current generation progress (0-previewCount) */
    progress: number;
    /** Generate preview pins from first N rows */
    generate: () => Promise<void>;
    /** Regenerate all preview pins */
    regenerate: () => Promise<void>;
    /** Clear preview data */
    clear: () => void;
    /** Total validation warnings across all pins */
    totalWarnings: number;
    /** Total validation errors across all pins */
    totalErrors: number;
}

// ============================================
// Constants
// ============================================
const DEFAULT_PREVIEW_COUNT = 5;

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate a single row's data against the field mapping
 */
function validateRowData(
    rowData: Record<string, string>,
    fieldMapping: Record<string, string>
): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    // Check for empty required fields
    for (const [templateField, csvColumn] of Object.entries(fieldMapping)) {
        const value = rowData[csvColumn];
        
        if (!value || value.trim() === '') {
            warnings.push({
                type: 'empty_field',
                message: `Field "${templateField}" is empty (column: ${csvColumn})`,
                severity: 'warning',
            });
        }
        
        // Check for very long text that might truncate
        if (value && value.length > 200) {
            warnings.push({
                type: 'text_truncation',
                message: `Field "${templateField}" has long text (${value.length} chars) that may be truncated`,
                severity: 'info',
            });
        }
    }
    
    // Check for image URL validity
    for (const [templateField, csvColumn] of Object.entries(fieldMapping)) {
        const value = rowData[csvColumn];
        
        if (value && (templateField.toLowerCase().includes('image') || templateField.toLowerCase().includes('photo'))) {
            // Check if it looks like a URL
            if (!value.startsWith('http://') && !value.startsWith('https://') && !value.startsWith('/')) {
                warnings.push({
                    type: 'image_loading',
                    message: `Field "${templateField}" doesn't look like a valid image URL`,
                    severity: 'error',
                });
            }
        }
    }
    
    return warnings;
}

// ============================================
// Hook
// ============================================

/**
 * Hook for generating preview pins from the first N CSV rows
 * 
 * @example
 * const { previewPins, isGenerating, generate } = usePreviewGeneration({
 *     csvRows: csvData.rows,
 *     templateElements: template.elements,
 *     canvasSize: template.canvas_size,
 *     backgroundColor: template.background_color,
 *     fieldMapping,
 * });
 * 
 * useEffect(() => {
 *     generate();
 * }, []);
 */
export function usePreviewGeneration({
    csvRows,
    templateElements,
    canvasSize,
    backgroundColor,
    fieldMapping,
    previewCount = DEFAULT_PREVIEW_COUNT,
    templates,
    distributionMode = 'sequential',
}: UsePreviewGenerationProps): UsePreviewGenerationResult {
    const [previewPins, setPreviewPins] = useState<PreviewPin[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    
    // Canvas pool for performance
    const canvasPoolRef = useRef(getCanvasPool({ maxSize: 3 }));
    
    // Abort controller for cancellation
    const abortControllerRef = useRef<AbortController | null>(null);
    
    /**
     * Generate preview pins from the first N rows
     */
    const generate = useCallback(async () => {
        // Don't regenerate if already have results
        if (previewPins.length > 0 && !error) {
            return;
        }
        
        // Cancel any ongoing generation
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        
        setIsGenerating(true);
        setError(null);
        setProgress(0);
        
        // Determine how many pins to preview (min of previewCount and available rows)
        const count = Math.min(previewCount, csvRows.length);
        
        // Initialize preview pins with pending status
        const initialPins: PreviewPin[] = Array.from({ length: count }, (_, i) => ({
            rowIndex: i,
            imageDataUrl: '',
            csvRowData: csvRows[i],
            validationWarnings: validateRowData(csvRows[i], fieldMapping),
            generationTimeMs: 0,
            status: 'pending',
        }));
        setPreviewPins(initialPins);
        
        // Pre-warm canvas pool
        canvasPoolRef.current.prewarm(2, canvasSize.width, canvasSize.height);
        
        // Preload fonts used in template before rendering
        const fontLoader = await import('@/lib/fonts/fontLoader');
        const fontResult = await fontLoader.preloadTemplateFonts(templateElements);
        if (fontResult.failed.length > 0) {
            console.warn('[PreviewGen] Some fonts failed to load:', fontResult.failed);
        }
        
        try {
            // Generate each preview pin
            for (let i = 0; i < count; i++) {
                // Check for abort
                if (abortControllerRef.current?.signal.aborted) {
                    return;
                }
                
                const rowData = csvRows[i];
                const startTime = Date.now();
                
                // Update status to generating
                setPreviewPins(prev => prev.map((pin, idx) => 
                    idx === i ? { ...pin, status: 'generating' as const } : pin
                ));
                
                try {
                    // MULTI-TEMPLATE: Determine which template to use for this row
                    let currentElements = templateElements;
                    let currentCanvasSize = canvasSize;
                    let currentBgColor = backgroundColor;
                    let currentTemplateId: string | undefined;
                    
                    if (templates && templates.length > 1) {
                        // Use distribution engine to select template
                        const templateSnapshots = templates.map(t => ({
                            id: t.id,
                            short_id: t.id.slice(0, 8),
                            name: t.name,
                            elements: t.elements,
                            canvas_size: t.canvasSize,
                            background_color: t.backgroundColor,
                        }));
                        
                        const distributionResult = getTemplateForRow(
                            {
                                templates: templateSnapshots,
                                mode: distributionMode,
                                totalRows: csvRows.length,
                            },
                            {
                                rowIndex: i,
                                csvRow: rowData as Record<string, unknown>,
                            }
                        );
                        
                        // Find the selected template
                        const selectedTemplate = templates.find(t => t.id === distributionResult.template.id);
                        if (selectedTemplate) {
                            currentElements = selectedTemplate.elements;
                            currentCanvasSize = selectedTemplate.canvasSize;
                            currentBgColor = selectedTemplate.backgroundColor;
                            currentTemplateId = selectedTemplate.id;
                        }
                        
                        console.log(`[PreviewGen] Row ${i}: Using template "${distributionResult.template.name}"${distributionResult.warning ? ` (${distributionResult.warning})` : ''}`);
                    }
                    
                    // Get canvas from pool (returns StaticCanvas directly)
                    const canvas = canvasPoolRef.current.acquire(
                        currentCanvasSize.width,
                        currentCanvasSize.height
                    );
                    
                    // BUGFIX: Enhanced logging for multi-image debugging
                    console.log(`[PreviewGen] Generating pin ${i + 1}:`, {
                        rowData: Object.keys(rowData),
                        fieldMapping,
                        templateId: currentTemplateId,
                        imageElementCount: currentElements.filter(e => e.type === 'image').length,
                        textElementCount: currentElements.filter(e => e.type === 'text').length,
                    });
                    
                    // Log each image element's dynamic binding
                    currentElements.forEach((el, idx) => {
                        if (el.type === 'image') {
                            const imgEl = el as ImageElement;
                            console.log(`[PreviewGen] Image element ${idx} (${imgEl.name}):`, {
                                isDynamic: imgEl.isDynamic,
                                dynamicSource: imgEl.dynamicSource,
                                imageUrl: imgEl.imageUrl?.substring(0, 50), // Truncate for readability
                                mappedColumn: imgEl.dynamicSource ? fieldMapping[imgEl.dynamicSource] : 'N/A',
                                csvValue: imgEl.dynamicSource && fieldMapping[imgEl.dynamicSource] 
                                    ? rowData[fieldMapping[imgEl.dynamicSource]]?.substring(0, 50) // Truncate for readability
                                    : 'N/A'
                            });
                        }
                    });

                    // Render the template with data - using RenderConfig object
                    await renderTemplate(
                        canvas,
                        currentElements,
                        {
                            width: currentCanvasSize.width,
                            height: currentCanvasSize.height,
                            backgroundColor: currentBgColor,
                        },
                        rowData,
                        fieldMapping as FieldMapping
                    );
                    
                    // Export to blob
                    const blob = await exportToBlob(canvas, 2);
                    
                    // Release canvas back to pool
                    canvasPoolRef.current.release(canvas);
                    
                    // Convert blob to data URL for preview
                    const imageDataUrl = await blobToDataUrl(blob);
                    
                    const generationTimeMs = Date.now() - startTime;
                    
                    // Update pin with result
                    setPreviewPins(prev => prev.map((pin, idx) => 
                        idx === i ? { 
                            ...pin, 
                            imageDataUrl,
                            generationTimeMs,
                            status: 'completed' as const,
                        } : pin
                    ));
                    
                } catch (pinError) {
                    console.error(`Preview pin ${i} failed:`, pinError);
                    
                    // Update pin with error
                    setPreviewPins(prev => prev.map((pin, idx) => 
                        idx === i ? { 
                            ...pin, 
                            status: 'failed' as const,
                            error: pinError instanceof Error ? pinError.message : 'Unknown error',
                            validationWarnings: [
                                ...pin.validationWarnings,
                                {
                                    type: 'image_loading' as const,
                                    message: 'Failed to generate preview',
                                    severity: 'error' as const,
                                }
                            ],
                        } : pin
                    ));
                }
                
                setProgress(i + 1);
            }
            
        } catch (err) {
            console.error('Preview generation failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate previews');
        } finally {
            setIsGenerating(false);
        }
    }, [csvRows, templateElements, canvasSize, backgroundColor, fieldMapping, previewCount, previewPins.length, error, templates, distributionMode]);
    
    /**
     * Force regenerate all preview pins
     */
    const regenerate = useCallback(async () => {
        setPreviewPins([]);
        setError(null);
        
        // Small delay to ensure state is cleared
        await new Promise(resolve => setTimeout(resolve, 50));
        
        await generate();
    }, [generate]);
    
    /**
     * Clear all preview data
     */
    const clear = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setPreviewPins([]);
        setError(null);
        setProgress(0);
        setIsGenerating(false);
    }, []);
    
    // Calculate total warnings and errors
    const totalWarnings = previewPins.reduce(
        (sum, pin) => sum + pin.validationWarnings.filter(w => w.severity === 'warning').length,
        0
    );
    
    const totalErrors = previewPins.reduce(
        (sum, pin) => sum + pin.validationWarnings.filter(w => w.severity === 'error').length + (pin.status === 'failed' ? 1 : 0),
        0
    );
    
    return {
        previewPins,
        isGenerating,
        error,
        progress,
        generate,
        regenerate,
        clear,
        totalWarnings,
        totalErrors,
    };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Convert a Blob to a data URL for preview display
 */
function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to convert blob to data URL'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
