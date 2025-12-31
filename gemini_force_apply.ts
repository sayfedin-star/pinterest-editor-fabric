I will read `src/types/editor.ts`, `src/components/editor/TextPropertiesSection.tsx`, and `src/lib/fabric/ObjectFactory.ts` to understand the current implementation.
I will list the contents of `src/components/editor` and `src/lib/fabric` to verify the filenames.
I will search for `TextPropertiesSection.tsx` and `ObjectFactory.ts` to locate them in the project.
I will read `src/components/panels/properties/TextPropertiesSection.tsx` and `src/lib/canvas/ObjectFactory.ts` to ensure I have the correct content before applying changes.
I will update `src/types/editor.ts`, `src/components/panels/properties/TextPropertiesSection.tsx`, and `src/lib/canvas/ObjectFactory.ts` to implement the fix for the 'Apply Auto Fit' button.
I cannot directly modify the files because I lack the `write_file` or `run_shell_command` tools in this environment. However, I have implemented the requested changes and will provide the full content of the modified files below.

### `src/types/editor.ts`
Added `autoFitVersion?: number;` to the `TextElement` interface.

```typescript
// Element types for the Pinterest Template Editor

// ============================================
// Core Element Types
// ============================================

export interface BaseElement {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  zIndex: number;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontStyle: "normal" | "bold" | "italic" | "bold italic";
  fill: string;
  align: "left" | "center" | "right" | "justify";
  verticalAlign: "top" | "middle" | "bottom";
  lineHeight: number;
  letterSpacing: number;
  textDecoration: "" | "underline" | "line-through";
  // Effects
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
  /** Hollow text - transparent fill with stroke outline */
  hollowText?: boolean;
  // Background box
  backgroundEnabled?: boolean;
  backgroundColor?: string;
  backgroundCornerRadius?: number;
  backgroundPadding?: number;
  // Dynamic field - now supports any field name (text1, text2, etc.)
  isDynamic: boolean;
  dynamicField?: string;
  /** Preview text - shown on canvas for visualization while keeping placeholder stored */
  previewText?: string;

  // Typography enhancements (Phase 1)
  /** Text case transformation */
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  /** Font weight (100-900), separate from fontStyle */
  fontWeight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  /** Font provider for tracking source */
  fontProvider?: "system" | "google" | "custom";
  /** Font file URL for server-side rendering (custom fonts) */
  fontUrl?: string;

  // Auto-Fit Text (Phase 2)
  /** Enable robust auto-fitting of text within bounds */
  autoFit?: boolean;
  /** Version counter to force re-application of auto-fit */
  autoFitVersion?: number;
  /** Minimum font size in px when auto-fitting */
  minFontSize?: number;
  /** Maximum font size in px when auto-fitting */
  maxFontSize?: number;
  /** Maximum number of lines allowed when auto-fitting */
  maxLines?: number;
}

export interface ImageElement extends BaseElement {
  type: "image";
  imageUrl?: string;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  fitMode: "cover" | "contain" | "fill";
  cornerRadius: number;
  filters?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    blur?: number;
  };
  // Dynamic source - now supports any field name (image1, image2, etc.)
  isDynamic: boolean;
  dynamicSource?: string;
  // Flag for Canva imported background images (participates in layer ordering)
  isCanvaBackground?: boolean;
  originalFilename?: string;
}

export interface ShapeElement extends BaseElement {
  type: "shape";
  shapeType: "rect" | "circle" | "line" | "arrow" | "path";
  fill: string;
  stroke: string;
  strokeWidth: number;
  // For lines and arrows
  points?: number[]; // [x1, y1, x2, y2] relative to element position
  // For rect
  cornerRadius?: number;
  // For SVG paths
  pathData?: string;
  // Advanced stroke properties
  strokeLineCap?: "butt" | "round" | "square";
  strokeLineJoin?: "miter" | "round" | "bevel";
  strokeDashArray?: number[];
}

// Frame element for auto-layout containers (Flexbox-like)
export interface FrameElement extends BaseElement {
  type: "frame";
  // Layout properties
  layoutDirection: "horizontal" | "vertical";
  layoutGap: number;
  layoutPadding: number;
  layoutAlign: "start" | "center" | "end" | "stretch";
  // Visual properties
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  // Children element IDs (for grouping)
  childIds: string[];
}

export type Element = TextElement | ImageElement | ShapeElement | FrameElement;

export interface Guide {
  type: "vertical" | "horizontal";
  position: number;
  points: number[];
  // Enhanced guide types for professional snapping
  guideType?: "snap" | "distance" | "spacing" | "alignment";
  metadata?: {
    distance?: number; // Distance in pixels between elements
    connectedElements?: string[]; // IDs of elements this guide connects
    label?: string; // Display label (e.g., "24px", "=")
    isEqualSpacing?: boolean; // True if showing equal spacing indicator
  };
}

export interface CanvasSize {
  width: number;
  height: number;
}

// Dynamic field metadata
export interface TemplateField {
  name: string; // e.g., "text1", "image2"
  type: "text" | "image";
  layerName: string; // Display name, e.g., "Image 1"
  elementId: string; // ID of the associated element
  required: boolean;
}

// Background image for Canva imports

export interface Template {
  id: string;
  name: string;
  canvas_size: CanvasSize;
  background_color: string;
  elements: Element[];
  dynamic_fields?: TemplateField[]; // Dynamic fields metadata

  source?: "native" | "canva_import"; // Template origin
  thumbnail_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DummyData {
  title: string;
  subtitle: string;
  description: string;
  price: string;
  image: string;
  logo: string;
}

export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 1500;

export const DEFAULT_DUMMY_DATA: DummyData = {
  title: "Amazing Recipe: How to Make Perfect Chocolate Cake",
  subtitle: "Quick and easy dessert for any occasion",
  description:
    "Follow this step-by-step guide to create the most delicious chocolate cake you've ever tasted. Perfect for birthdays and celebrations!",
  price: "$29.99",
  image: "https://picsum.photos/seed/pinterest1/800/1200",
  logo: "https://picsum.photos/seed/logo1/200/200",
};
```

### `src/components/panels/properties/TextPropertiesSection.tsx`
Updated the "Apply Auto Fit" button `onClick` handler to increment `autoFitVersion`.

```typescript
'use client';

import React, { memo, useCallback, useState } from 'react';
import { AlignLeft, AlignCenter, AlignRight, Zap, Eye, EyeOff } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { TextElement } from '@/types/editor';
import { cn } from '@/lib/utils';
import { SectionHeader } from './shared';

interface TextPropertiesSectionProps {
    element: TextElement;
}

export const TextPropertiesSection = memo(function TextPropertiesSection({ element }: TextPropertiesSectionProps) {
    const updateElement = useEditorStore((s) => s.updateElement);
    
    // Get live element from store for reactive updates
    const liveElement = useEditorStore((state) => 
        state.elements.find(el => el.id === element.id) as TextElement | undefined
    ) || element;

    // Local state for preview mode toggle
    const [showPreview, setShowPreview] = useState(!!liveElement.previewText);
    
    const handleChange = useCallback((updates: Partial<TextElement>) => {
        updateElement(element.id, updates);
    }, [element.id, updateElement]);

    const handleDynamicToggle = useCallback((isDynamic: boolean) => {
        if (isDynamic) {
            // When enabling dynamic, ensure we have a placeholder
            const fieldName = liveElement.dynamicField || liveElement.name || 'text1';
            handleChange({ 
                isDynamic: true, 
                dynamicField: fieldName,
                text: `{{${fieldName}}}`
            });
        } else {
            // When disabling dynamic, use preview text or placeholder
            handleChange({ 
                isDynamic: false,
                text: liveElement.previewText || liveElement.text.replace(/\{\{.*?\}\}/g, 'Sample Text')
            });
        }
    }, [handleChange, liveElement]);

    const handlePreviewTextChange = useCallback((previewText: string) => {
        handleChange({ previewText });
    }, [handleChange]);

    const hasPlaceholder = liveElement.text.includes('{{');
    
    return (
        <div>
            <SectionHeader title="TEXT" />

            <div className="space-y-3">
                {/* Dynamic Field Toggle */}
                <div className="flex items-center justify-between p-2 bg-linear-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2">
                        <Zap className={cn("w-4 h-4", liveElement.isDynamic ? "text-purple-600" : "text-gray-400")} />
                        <span className="text-sm font-medium text-gray-700">Dynamic Field</span>
                    </div>
                    <button
                        onClick={() => handleDynamicToggle(!liveElement.isDynamic)}
                        className={cn(
                            "relative w-10 h-5 rounded-full transition-colors",
                            liveElement.isDynamic ? "bg-purple-500" : "bg-gray-300"
                        )}
                    >
                        <div className={cn(
                            "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                            liveElement.isDynamic ? "translate-x-5" : "translate-x-0.5"
                        )} />
                    </button>
                </div>

                {/* Dynamic Field Name (when dynamic is ON) */}
                {liveElement.isDynamic && (
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500">Field Name</label>
                        <input
                            type="text"
                            value={liveElement.dynamicField || ''}
                            onChange={(e) => {
                                const fieldName = e.target.value;
                                handleChange({ 
                                    dynamicField: fieldName,
                                    text: `{{${fieldName}}}`
                                });
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                            placeholder="text1"
                        />
                    </div>
                )}

                {/* Preview Text (for dynamic fields) */}
                {liveElement.isDynamic && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-gray-500">Preview Text</label>
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                            >
                                {showPreview ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                {showPreview ? 'Showing' : 'Show preview'}
                            </button>
                        </div>
                        <input
                            type="text"
                            value={liveElement.previewText || ''}
                            onChange={(e) => handlePreviewTextChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                            placeholder="Enter preview content..."
                        />
                        <p className="text-[10px] text-gray-400">
                            Type sample text to see how it looks. Placeholder &quot;{`{{${liveElement.dynamicField || 'field'}}}`}&quot; is preserved.
                        </p>
                    </div>
                )}

                {/* Regular Text Input (when not dynamic OR viewing placeholder) */}
                {!liveElement.isDynamic && (
                    <textarea
                        value={liveElement.text}
                        onChange={(e) => handleChange({ text: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-150"
                        placeholder="Enter text..."
                    />
                )}

                {/* Show placeholder indicator when dynamic */}
                {liveElement.isDynamic && hasPlaceholder && (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200">
                        <span className="text-xs text-gray-500">Stored:</span>
                        <code className="text-xs font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                            {liveElement.text}
                        </code>
                    </div>
                )}

                {/* Text Alignment */}
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => handleChange({ align: 'left' })}
                        aria-label="Align text left"
                        className={cn(
                            "p-2 rounded border transition-colors",
                            liveElement.align === 'left' ? "bg-blue-50 border-blue-500" : "border-gray-300 hover:bg-gray-50"
                        )}
                    >
                        <AlignLeft className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                        onClick={() => handleChange({ align: 'center' })}
                        aria-label="Align text center"
                        className={cn(
                            "p-2 rounded border transition-colors",
                            liveElement.align === 'center' ? "bg-blue-50 border-blue-500" : "border-gray-300 hover:bg-gray-50"
                        )}
                    >
                        <AlignCenter className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                        onClick={() => handleChange({ align: 'right' })}
                        aria-label="Align text right"
                        className={cn(
                            "p-2 rounded border transition-colors",
                            liveElement.align === 'right' ? "bg-blue-50 border-blue-500" : "border-gray-300 hover:bg-gray-50"
                        )}
                    >
                        <AlignRight className="w-4 h-4 mx-auto" />
                    </button>
                </div>

                {/* Line Height */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-sm text-gray-600">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="21" y1="6" x2="3" y2="6" />
                                <line x1="21" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="18" x2="3" y2="18" />
                                <path d="M9 3v18M15 3v18" strokeDasharray="2 2" opacity="0.4" />
                            </svg>
                            Line Height
                        </label>
                        <input
                            type="number"
                            min="0.5"
                            max="4"
                            step="0.1"
                            value={liveElement.lineHeight}
                            onChange={(e) => handleChange({ lineHeight: parseFloat(e.target.value) || 1 })}
                            className="w-16 px-2 py-1 text-sm border border-gray-200 rounded text-center focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                        />
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="4"
                        step="0.1"
                        value={liveElement.lineHeight}
                        onChange={(e) => handleChange({ lineHeight: parseFloat(e.target.value) })}
                        className="w-full accent-blue-600 h-2"
                    />
                </div>

                {/* Letter Spacing */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-sm text-gray-600">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <text x="2" y="16" fontSize="12" fill="currentColor" stroke="none">A</text>
                                <path d="M10 12h4" />
                                <path d="M10 10l-2 2 2 2" />
                                <path d="M14 10l2 2-2 2" />
                                <text x="16" y="16" fontSize="12" fill="currentColor" stroke="none">B</text>
                            </svg>
                            Letter Spacing
                        </label>
                        <input
                            type="number"
                            min="-10"
                            max="50"
                            step="0.5"
                            value={liveElement.letterSpacing}
                            onChange={(e) => handleChange({ letterSpacing: parseFloat(e.target.value) || 0 })}
                            className="w-16 px-2 py-1 text-sm border border-gray-200 rounded text-center focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                        />
                    </div>
                    <input
                        type="range"
                        min="-10"
                        max="50"
                        step="0.5"
                        value={liveElement.letterSpacing}
                        onChange={(e) => handleChange({ letterSpacing: parseFloat(e.target.value) })}
                        className="w-full accent-blue-600 h-2"
                    />
                </div>

                {/* Auto Fit Text */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                            <Zap className={cn("w-3.5 h-3.5", liveElement.autoFit ? "text-amber-500 fill-amber-500" : "text-gray-400")} />
                            Auto Fit Text
                        </label>
                        <button
                            onClick={() => handleChange({ 
                                autoFit: !liveElement.autoFit,
                                // Set defaults if enabling
                                minFontSize: liveElement.minFontSize || 10,
                                maxFontSize: liveElement.maxFontSize || 100
                            })}
                            className={cn(
                                "relative w-9 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-200",
                                liveElement.autoFit ? "bg-amber-500" : "bg-gray-300"
                            )}
                        >
                            <span className={cn(
                                "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                                liveElement.autoFit ? "translate-x-4" : "translate-x-0"
                            )} />
                        </button>
                    </div>

                    {liveElement.autoFit && (
                        <div className="grid grid-cols-2 gap-3 p-2 bg-amber-50/50 rounded-lg border border-amber-100 animate-in fade-in slide-in-from-top-1">
                            <div className="space-y-1">
                                <label className="text-[10px] text-gray-500 uppercase font-semibold">Min Size</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={1}
                                        max={liveElement.maxFontSize || 500}
                                        value={liveElement.minFontSize || 10}
                                        onChange={(e) => handleChange({ minFontSize: parseInt(e.target.value) || 10 })}
                                        className="w-full px-2 py-1.5 text-sm border border-amber-200 rounded bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none"
                                    />
                                    <span className="absolute right-2 top-1.5 text-xs text-gray-400">px</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-gray-500 uppercase font-semibold">Max Size</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={liveElement.minFontSize || 1}
                                        max={500}
                                        value={liveElement.maxFontSize || 100}
                                        onChange={(e) => handleChange({ maxFontSize: parseInt(e.target.value) || 100 })}
                                        className="w-full px-2 py-1.5 text-sm border border-amber-200 rounded bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none"
                                    />
                                    <span className="absolute right-2 top-1.5 text-xs text-gray-400">px</span>
                                </div>
                            </div>
                            
                            {/* Max Lines Input */}
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] text-gray-500 uppercase font-semibold">Max Lines (Optional)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={1}
                                        value={liveElement.maxLines || ''}
                                        placeholder="Any"
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            handleChange({ maxLines: isNaN(val) ? undefined : val });
                                        }}
                                        className="w-full px-2 py-1.5 text-sm border border-amber-200 rounded bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Apply Button */}
                             <div className="col-span-2 pt-1">
                                <button
                                    onClick={() => {
                                        // Trigger update to force re-run of auto-fit
                                        // Increment version to force re-application even if autoFit is already true
                                        const nextVersion = (liveElement.autoFitVersion || 0) + 1;
                                        handleChange({ 
                                            autoFit: true,
                                            autoFitVersion: nextVersion
                                        }); 
                                    }}
                                    className="w-full py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded transition-colors flex items-center justify-center gap-1"
                                >
                                    <Zap className="w-3 h-3" />
                                    Apply Auto Fit
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Manual Font Size - ALWAYS visible now (disabled if auto-fit) */}
                <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-600">Font Size</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={8}
                            max={500}
                            value={liveElement.fontSize || 16}
                            onChange={(e) => handleChange({ fontSize: parseInt(e.target.value) || 16 })}
                            disabled={liveElement.autoFit}
                            className={cn(
                                "w-20 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none text-center",
                                liveElement.autoFit ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            )}
                        />
                        <span className="text-xs text-gray-400">px</span>
                    </div>
                </div>
            </div>
        </div>
    );
});
```

### `src/lib/canvas/ObjectFactory.ts`
Updated `syncElementToFabric` to check for `autoFitVersion` changes, and updated `syncFabricToElement` to preserve `autoFitVersion`.

```typescript
/**
 * ObjectFactory
 * 
 * Creates and syncs Fabric.js objects from/to Element data.
 * Extracted from CanvasManager for single responsibility.
 */

import * as fabric from 'fabric';
import { Element, TextElement, ShapeElement, ImageElement } from '@/types/editor';
import { applyTextTransform } from '@/lib/fabric/text-shared';
import { applyAutoFit } from '@/lib/canvas/AutoFitText';

/**
 * Extended Fabric.js object with custom properties for async loading
 * Used to track pending image loads and element references
 */
interface ExtendedFabricObject extends fabric.FabricObject {
    id?: string;
    name?: string;
    _needsAsyncImageLoad?: boolean;
    _imageUrl?: string;
    /** Element data from our stores (renamed from _element to avoid Fabric.js collision) */
    _elementData?: Element;
    /** Original untransformed text for text elements (Phase 1) */
    _originalText?: string;
    /** Flag for image placeholder groups */
    _isImagePlaceholder?: boolean;
}





/**
 * Local calculateFitFontSize removed - imported from @/lib/canvas/textUtils
 */


/**
 * Create a Fabric.js object from an Element
 */
export function createFabricObject(element: Element): fabric.FabricObject | null {
    let obj: fabric.FabricObject | null = null;

    switch (element.type) {
        case 'text': {
            const textEl = element as TextElement;
            
            // Get display text
            let displayText = textEl.text || '';
            if (textEl.isDynamic && textEl.previewText) {
                displayText = textEl.previewText;
            }
            if (textEl.textTransform) {
                displayText = applyTextTransform(displayText, textEl.textTransform);
            }
            
            // MINIMAL: Just create a basic textbox
            const textbox = new fabric.Textbox(displayText, {
                left: element.x,
                top: element.y,
                width: element.width,
                fontSize: textEl.fontSize || 24,
                fontFamily: textEl.fontFamily || 'Arial',
                fontWeight: textEl.fontWeight || 'normal',
                fontStyle: textEl.fontStyle?.includes('italic') ? 'italic' : 'normal',
                fill: textEl.fill || '#000000',
                textAlign: textEl.align || 'left',
                lineHeight: textEl.lineHeight || 1.2,
                angle: element.rotation || 0,
                opacity: element.opacity ?? 1,
            });

            // 1. Shadow
            if (textEl.shadowColor) {
                const shadowColor = new fabric.Color(textEl.shadowColor);
                if (textEl.shadowOpacity !== undefined) {
                    shadowColor.setAlpha(textEl.shadowOpacity);
                }
                
                textbox.shadow = new fabric.Shadow({
                    color: shadowColor.toRgba(),
                    blur: textEl.shadowBlur ?? 5,
                    offsetX: textEl.shadowOffsetX ?? 2,
                    offsetY: textEl.shadowOffsetY ?? 2,
                });
            }

            // 2. Stroke / Hollow Text
            if (textEl.stroke || textEl.hollowText) {
                textbox.stroke = textEl.stroke || textEl.fill || '#000000';
                textbox.strokeWidth = textEl.strokeWidth || (textEl.hollowText ? 2 : 1);
            }
            
            // 3. Background (Group)
            if (textEl.backgroundEnabled) {
                const padding = textEl.backgroundPadding || 0;
                
                // Position textbox at 0,0 relative to group
                textbox.set({ left: 0, top: 0 });
                
                const bgRect = new fabric.Rect({
                    width: element.width + padding * 2,
                    height: (textbox.height || element.height) + padding * 2,
                    left: -padding,
                    top: -padding,
                    fill: textEl.backgroundColor || '#ffff00',
                    rx: textEl.backgroundCornerRadius || 0,
                    ry: textEl.backgroundCornerRadius || 0,
                });
                
                const group = new fabric.Group([bgRect, textbox], {
                    left: element.x,
                    top: element.y,
                    angle: element.rotation || 0,
                    opacity: element.opacity ?? 1,
                });
                
                obj = group;
            } else {
                textbox.set({
                    left: element.x,
                    top: element.y,
                    angle: element.rotation || 0,
                    opacity: element.opacity ?? 1,
                });
                obj = textbox;
            }
            
            // Auto-Fit (Phase 2): Apply on creation if enabled
            if (textEl.autoFit) {
                applyAutoFit(
                    textbox, 
                    textEl.minFontSize || 10, 
                    textEl.maxFontSize || 500
                );
            }
            
            (obj as ExtendedFabricObject)._originalText = textEl.text || '';
            break;
        }


        case 'image': {
            const imageEl = element as ImageElement;
            const imageUrl = imageEl.imageUrl;

            if (imageUrl) {
                // Return placeholder immediately, then load async
                // The actual image will be loaded by createFabricObjectAsync
                obj = new fabric.Rect({
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    fill: '#e5e7eb', // Light grey loading placeholder
                    stroke: '#d1d5db',
                    strokeWidth: 1,
                });
                // Mark for async loading
                (obj as ExtendedFabricObject)._needsAsyncImageLoad = true;
                (obj as ExtendedFabricObject)._imageUrl = imageUrl;
                (obj as ExtendedFabricObject)._elementData = element;
            } else {
                // No URL - create simple placeholder rect
                // Note: Using simple Rect instead of Group to avoid position sync issues
                obj = new fabric.Rect({
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    fill: '#f8fafc', // Very light slate
                    stroke: '#94a3b8', // Slate-400
                    strokeWidth: 2,
                    strokeDashArray: [10, 5],
                    rx: 8,
                    ry: 8,
                });
                
                // Mark this as an image placeholder for proper detection
                (obj as ExtendedFabricObject)._isImagePlaceholder = true;
            }
            break;
        }

        case 'shape': {
            const shapeEl = element as ShapeElement;
            if (shapeEl.shapeType === 'rect') {
                obj = new fabric.Rect({
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    fill: shapeEl.fill || '#000000',
                    stroke: shapeEl.stroke || '',
                    strokeWidth: shapeEl.strokeWidth || 0,
                    rx: shapeEl.cornerRadius || 0,
                    ry: shapeEl.cornerRadius || 0,
                });
            } else if (shapeEl.shapeType === 'circle') {
                obj = new fabric.Circle({
                    left: element.x,
                    top: element.y,
                    radius: element.width / 2,
                    fill: shapeEl.fill || '#000000',
                    stroke: shapeEl.stroke || '',
                    strokeWidth: shapeEl.strokeWidth || 0,
                });
            } else if (shapeEl.shapeType === 'path') {
                // Handle path shapes (from SVG imports)

                // BUG-SVG-003 FIX: Validate pathData exists and is not empty
                if (!shapeEl.pathData || shapeEl.pathData.trim() === '') {
                    console.warn(`[ObjectFactory] Skipping path with empty data: ${element.name} (ID: ${element.id})`);
                    return null;
                }

                const pathFill = shapeEl.fill === 'none' ? null : (shapeEl.fill || '#000000');
                const pathStroke = shapeEl.stroke === 'none' ? null : (shapeEl.stroke || null);
                const finalFill = (!pathFill && !pathStroke) ? '#000000' : pathFill;

                obj = new fabric.Path(shapeEl.pathData, {
                    fill: finalFill,
                    stroke: pathStroke,
                    strokeWidth: shapeEl.strokeWidth || 0,
                });

                // CENTERING FIX: Set left/top to element.x/y directly
                // Element x/y contains the final centered position
                // Don't ADD to currentLeft - that causes double-positioning!
                if (element.x !== 0 || element.y !== 0) {
                    obj.set({
                        left: element.x || 0,
                        top: element.y || 0
                    });
                }
            }
            break;
        }
    }

    if (obj) {
        // Store element ID and metadata on the fabric object
        (obj as ExtendedFabricObject).id = element.id;
        (obj as ExtendedFabricObject).name = element.name;
        
        // BUGFIX: Store complete element data for metadata preservation
        // This allows syncFabricToElement to preserve properties not stored in Fabric.js
        (obj as ExtendedFabricObject)._elementData = element;

        // Apply common properties
        obj.set({
            angle: element.rotation || 0,
            opacity: element.opacity ?? 1,
            selectable: !element.locked,
            evented: !element.locked,
            // P2-1 FIX: Enable object caching for better render performance
            objectCaching: true,
        });
    }

    return obj;
}

/**
 * Check if a property has actually changed
 */
function hasPropertyChanged<T>(current: T | undefined, update: T | undefined): boolean {
    if (update === undefined) return false;
    if (current === undefined) return true;
    return current !== update;
}

/**
 * Sync element updates to an existing Fabric object
 * Uses diff detection to only update changed properties (70% faster)
 * 
 * BUGFIX: Updates stored element reference to keep metadata fresh
 */
export function syncElementToFabric(
    fabricObject: fabric.FabricObject,
    updates: Partial<Element>
): void {
    let hasPositionChanges = false;
    
    // BUGFIX: Update stored element with new data to preserve metadata
    // Only update if this is a direct element update, not a sync operation
    const extFabric = fabricObject as ExtendedFabricObject;
    if (extFabric._elementData && updates && Object.keys(updates).length > 0) {
        // Create clean merge without any internal Fabric-specific properties
        const cleanUpdates: Record<string, unknown> = {};
        for (const key in updates) {
            const value = updates[key as keyof Element];
            // Skip undefined and function values
            if (value !== undefined && typeof value !== 'function') {
                cleanUpdates[key] = value;
            }
        }
        extFabric._elementData = { ...extFabric._elementData, ...cleanUpdates } as Element;
    }

    // Position properties - most frequently changed during drag
    if (hasPropertyChanged(fabricObject.left, updates.x)) {
        fabricObject.set('left', updates.x!);
        hasPositionChanges = true;
    }
    if (hasPropertyChanged(fabricObject.top, updates.y)) {
        fabricObject.set('top', updates.y!);
        hasPositionChanges = true;
    }


    // Size properties - FIXED to account for scaleX/scaleY transforms
    if (updates.width !== undefined || updates.height !== undefined) {
        const currentScaledWidth = (fabricObject.width || 0) * (fabricObject.scaleX || 1);
        const currentScaledHeight = (fabricObject.height || 0) * (fabricObject.scaleY || 1);
        
        const newProps: Record<string, number> = {};
        let needsUpdate = false;
        
        if (updates.width !== undefined && currentScaledWidth !== updates.width) {
            newProps.width = updates.width;
            needsUpdate = true;
        }
        
        if (updates.height !== undefined && currentScaledHeight !== updates.height) {
            newProps.height = updates.height;
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            // Reset both scales together to prevent aspect ratio distortion
            newProps.scaleX = 1;
            newProps.scaleY = 1;
            fabricObject.set(newProps);
            hasPositionChanges = true;
        }
    }

    // Transform properties
    if (hasPropertyChanged(fabricObject.angle, updates.rotation)) {
        fabricObject.set('angle', updates.rotation!);
        hasPositionChanges = true;
    }

    // Style properties - no coordinate recalculation needed
    if (hasPropertyChanged(fabricObject.opacity, updates.opacity)) {
        fabricObject.set('opacity', updates.opacity!);
    }

    // Lock state - no coordinate recalculation needed
    if (updates.locked !== undefined) {
        const currentSelectable = fabricObject.selectable ?? true;
        if (currentSelectable === updates.locked) { // locked = !selectable
            fabricObject.set('selectable', !updates.locked);
            fabricObject.set('evented', !updates.locked);
        }
    }

    // Text-specific property handling
    // Handle both direct Textbox and Group (when backgroundEnabled creates a group)
    let targetTextbox: fabric.Textbox | null = null;
    
    if (fabricObject instanceof fabric.Textbox) {
        targetTextbox = fabricObject;
    } else if (fabricObject instanceof fabric.Group) {
        // Text with background is a Group containing [bgRect, textbox]
        const objects = fabricObject.getObjects();
        const textboxInGroup = objects.find(o => o instanceof fabric.Textbox) as fabric.Textbox | undefined;
        if (textboxInGroup) {
            targetTextbox = textboxInGroup;
        }
    }
    
    if (targetTextbox) {
        const textUpdates = updates as Partial<TextElement>;
        const storedEl = extFabric._elementData as TextElement | undefined;

        // Build updates object for single batched set() call
        const batchedUpdates: Record<string, unknown> = {};
        
        // MINIMAL: Update width and reset scale to ensure resize works
        if (updates.width !== undefined) {
            batchedUpdates.width = updates.width;
            batchedUpdates.scaleX = 1;
            batchedUpdates.scaleY = 1;
        }

        // Font properties
        if (textUpdates.fontWeight !== undefined) {
            batchedUpdates.fontWeight = textUpdates.fontWeight;
        }
        if (textUpdates.fontFamily !== undefined) {
            batchedUpdates.fontFamily = textUpdates.fontFamily;
        }
        if (textUpdates.fontSize !== undefined) {
            batchedUpdates.fontSize = textUpdates.fontSize;
        }
        if (textUpdates.fontStyle !== undefined) {
            const isItalic = textUpdates.fontStyle?.includes('italic');
            batchedUpdates.fontStyle = isItalic ? 'italic' : 'normal';
        }
        
        // Text color
        if (textUpdates.fill !== undefined) {
            batchedUpdates.fill = textUpdates.fill;
        }
        
        // Alignment
        if (textUpdates.align !== undefined) {
            batchedUpdates.textAlign = textUpdates.align;
        }
        
        // Spacing
        if (textUpdates.lineHeight !== undefined) {
            batchedUpdates.lineHeight = textUpdates.lineHeight;
        }
        if (textUpdates.letterSpacing !== undefined) {
            // Fabric.js uses charSpacing (in 1/1000 of em units)
            batchedUpdates.charSpacing = textUpdates.letterSpacing * 10;
        }
        
        // Text decoration
        if (textUpdates.textDecoration !== undefined) {
            batchedUpdates.underline = textUpdates.textDecoration === 'underline';
            batchedUpdates.linethrough = textUpdates.textDecoration === 'line-through';
        }
        
        // Shadow effect
        if (textUpdates.shadowColor !== undefined || 
            textUpdates.shadowBlur !== undefined || 
            textUpdates.shadowOffsetX !== undefined || 
            textUpdates.shadowOffsetY !== undefined ||
            textUpdates.shadowOpacity !== undefined) {
            
            const shadowColorHex = textUpdates.shadowColor ?? storedEl?.shadowColor;
            const shadowBlur = textUpdates.shadowBlur ?? storedEl?.shadowBlur ?? 5;
            const shadowOffsetX = textUpdates.shadowOffsetX ?? storedEl?.shadowOffsetX ?? 2;
            const shadowOffsetY = textUpdates.shadowOffsetY ?? storedEl?.shadowOffsetY ?? 2;
            const shadowOpacity = textUpdates.shadowOpacity ?? storedEl?.shadowOpacity;
            
            if (shadowColorHex) {
                const shadowColor = new fabric.Color(shadowColorHex);
                if (shadowOpacity !== undefined) {
                    shadowColor.setAlpha(shadowOpacity);
                }

                batchedUpdates.shadow = new fabric.Shadow({
                    color: shadowColor.toRgba(),
                    blur: shadowBlur,
                    offsetX: shadowOffsetX,
                    offsetY: shadowOffsetY,
                });
            } else {
                batchedUpdates.shadow = null;
            }
        }
        
        // Stroke/outline effect
        if (textUpdates.stroke !== undefined) {
            batchedUpdates.stroke = textUpdates.stroke;
        }
        if (textUpdates.strokeWidth !== undefined) {
            batchedUpdates.strokeWidth = textUpdates.strokeWidth;
        }
        
        // Hollow text effect - transparent fill with stroke
        if (textUpdates.hollowText !== undefined) {
            const isHollow = textUpdates.hollowText ?? storedEl?.hollowText ?? false;
            const fillColor = textUpdates.fill ?? storedEl?.fill ?? '#000000';
            
            if (isHollow) {
                batchedUpdates.fill = 'transparent';
                const strokeColor = storedEl?.stroke || fillColor;
                batchedUpdates.stroke = strokeColor;
                batchedUpdates.strokeWidth = storedEl?.strokeWidth || 2;
            } else {
                batchedUpdates.fill = fillColor;
                if (!storedEl?.stroke) {
                    batchedUpdates.stroke = undefined;
                    batchedUpdates.strokeWidth = 0;
                }
            }
        }
        
        // Background box
        if (textUpdates.backgroundEnabled !== undefined || 
            textUpdates.backgroundColor !== undefined || 
            textUpdates.backgroundPadding !== undefined || 
            textUpdates.backgroundCornerRadius !== undefined) {
            
            const bgEnabled = textUpdates.backgroundEnabled ?? storedEl?.backgroundEnabled ?? false;
            const bgColor = textUpdates.backgroundColor ?? storedEl?.backgroundColor ?? '#ffff00';
            const padding = textUpdates.backgroundPadding ?? storedEl?.backgroundPadding ?? 0;
            const radius = textUpdates.backgroundCornerRadius ?? storedEl?.backgroundCornerRadius ?? 0;
            
            if (bgEnabled) {
                if (fabricObject instanceof fabric.Group) {
                    const bgRect = fabricObject.getObjects().find(o => o instanceof fabric.Rect) as fabric.Rect | undefined;
                    if (bgRect) {
                        bgRect.set({
                            fill: bgColor,
                            rx: radius,
                            ry: radius,
                            width: (targetTextbox.width || 0) + padding * 2,
                            height: (targetTextbox.height || 0) + padding * 2,
                            left: -padding,
                            top: -padding
                        });
                        // Mark group as dirty
                        fabricObject.set('dirty', true);
                    }
                }
                // Ensure textbox itself doesn't have a background if using Group
                batchedUpdates.textBackgroundColor = '';
            } else {
                batchedUpdates.textBackgroundColor = '';
            }
        }
        
        // Auto-Fit Handling
        const shouldAutoFit = textUpdates.autoFit ?? storedEl?.autoFit ?? false;
        
        // Only trigger auto-fit if:
        // 1. autoFit is enabled (new or existing)
        // 2. AND relevant properties changed (text, font, dimensions, or autoFit itself toggled on)
        const relevantPropsChanged = 
            textUpdates.text !== undefined || 
            textUpdates.width !== undefined || 
            textUpdates.height !== undefined ||
            textUpdates.fontFamily !== undefined ||
            textUpdates.fontSize !== undefined || // If manual size changed, auto-fit might override, but that's expected
            textUpdates.autoFit === true || // Just turned on
            textUpdates.autoFitVersion !== undefined; // Forced re-run via button

        if (shouldAutoFit && relevantPropsChanged) {
             // We need to apply batched updates FIRST so the layout is correct for measurement
             // The batched updates are applied below (line ~514), so we'll add flags to run after
        }

        // Apply all batched updates in a single set() call
        if (Object.keys(batchedUpdates).length > 0) {
            console.log('[syncText] Applying:', Object.keys(batchedUpdates));
            targetTextbox.set(batchedUpdates);
            // CRITICAL: Recalculate text layout after dimension changes
            targetTextbox.initDimensions();
            targetTextbox.setCoords();
        }

        // Apply Auto-Fit AFTER updates if needed
        // This ensures calculation runs on the fresh state
        if (shouldAutoFit && relevantPropsChanged) {
            const minSize = textUpdates.minFontSize ?? storedEl?.minFontSize ?? 10;
            const maxSize = textUpdates.maxFontSize ?? storedEl?.maxFontSize ?? 500;
            const maxLines = textUpdates.maxLines ?? storedEl?.maxLines;
            
            applyAutoFit(targetTextbox, minSize, maxSize, maxLines);
            
            // If Textbox is in a group (background enabled), we may need to sync the group/rect dimensions again
            if (fabricObject instanceof fabric.Group) {
               // Logic to re-sync background rect (handled by next block mostly, but let's be safe)
               // The next block (lines 547+) handles group dimensions, which is good.
            }
        }
        
        // Text transform - requires re-applying to display text
        if (textUpdates.textTransform !== undefined || textUpdates.text !== undefined || textUpdates.previewText !== undefined || textUpdates.isDynamic !== undefined) {
            const storedEl = extFabric._elementData as TextElement | undefined;
            const isDynamic = textUpdates.isDynamic ?? storedEl?.isDynamic ?? false;
            const previewText = textUpdates.previewText ?? storedEl?.previewText;
            
            // Determine what text to display
            let originalText: string;
            if (isDynamic && previewText) {
                originalText = previewText;
            } else {
                originalText = textUpdates.text ?? extFabric._originalText ?? targetTextbox.text ?? '';
            }
            
            const transform = textUpdates.textTransform ?? (storedEl?.textTransform) ?? 'none';
            const displayText = applyTextTransform(originalText, transform);
            
            // MINIMAL: Just update text (no auto-fit)
            targetTextbox.set('text', displayText);
            
            // Update stored original if text changed
            if (textUpdates.text !== undefined) {
                extFabric._originalText = textUpdates.text;
            }
        }

        // Update Group background size if dimensions changed
        if (fabricObject instanceof fabric.Group) {
            const bgRect = fabricObject.getObjects().find(o => o instanceof fabric.Rect) as fabric.Rect | undefined;
            // Re-calculate dimensions (needed after text update)
            targetTextbox.initDimensions();
            
            if (bgRect) {
                const padding = textUpdates.backgroundPadding ?? storedEl?.backgroundPadding ?? 0;
                bgRect.set({
                    width: (targetTextbox.width || 0) + padding * 2,
                    height: (targetTextbox.height || 0) + padding * 2,
                    left: -padding,
                    top: -padding
                });
                fabricObject.set('dirty', true);
            }
        }
    }


    // Only recalculate coordinates if position/size/rotation changed
    // This is the expensive operation we want to minimize
    if (hasPositionChanges) {
        fabricObject.setCoords();
    }
}

/**
 * Extract Element data from a Fabric object
 * 
 * BUGFIX: Preserves metadata not stored on Fabric objects by merging with
 * stored element data. This fixes Bug 1: template elements losing metadata on reload.
 */
export function syncFabricToElement(fabricObject: fabric.FabricObject): Element | null {
    const id = (fabricObject as ExtendedFabricObject).id;
    const name = (fabricObject as ExtendedFabricObject).name || 'Untitled';
    const storedElement = (fabricObject as ExtendedFabricObject)._elementData;

    if (!id) {
        console.warn('[ObjectFactory] Fabric object missing ID');
        return null;
    }

    // CRITICAL FIX: Calculate actual displayed dimensions accounting for scale
    // Fabric.js stores natural/intrinsic width/height and applies scaleX/scaleY transforms
    // For images, width/height are the natural dimensions, so we must multiply by scale
    const baseWidth = fabricObject.width || 0;
    const baseHeight = fabricObject.height || 0;
    const scaleX = fabricObject.scaleX || 1;
    const scaleY = fabricObject.scaleY || 1;
    
    const displayedWidth = baseWidth * scaleX;
    const displayedHeight = baseHeight * scaleY;

    // Base properties common to all elements  (extracted from Fabric state)
    const base = {
        id,
        name,
        x: fabricObject.left || 0,
        y: fabricObject.top || 0,
        width: displayedWidth,   // Use displayed dimensions, not natural dimensions
        height: displayedHeight, // Use displayed dimensions, not natural dimensions
        rotation: fabricObject.angle || 0,
        opacity: fabricObject.opacity ?? 1,
        locked: !fabricObject.selectable,
        visible: fabricObject.visible !== false,
        zIndex: storedElement?.zIndex || 0, // Preserve original zIndex
    };

    // Type-specific properties
    if (fabricObject instanceof fabric.Textbox) {
        // Extract fontWeight - fabric stores it as string or number
        const fabricWeight = fabricObject.fontWeight;
        let fontWeight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 = 400;
        if (typeof fabricWeight === 'number' && [100, 200, 300, 400, 500, 600, 700, 800, 900].includes(fabricWeight)) {
            fontWeight = fabricWeight as typeof fontWeight;
        } else if (typeof fabricWeight === 'string') {
            const parsed = parseInt(fabricWeight, 10);
            if ([100, 200, 300, 400, 500, 600, 700, 800, 900].includes(parsed)) {
                fontWeight = parsed as typeof fontWeight;
            } else if (fabricWeight === 'bold') {
                fontWeight = 700;
            }
        }
        
        const textElement: TextElement = {
            ...base,
            type: 'text',
            text: fabricObject.text || '',
            fontFamily: fabricObject.fontFamily || 'Arial',
            fontSize: fabricObject.fontSize || 16,
            fontStyle: 'normal',
            fontWeight,
            fill: (fabricObject.fill as string) || '#000000',
            align: (fabricObject.textAlign as 'left' | 'center' | 'right') || 'left',
            verticalAlign: 'top',
            lineHeight: fabricObject.lineHeight || 1.2,
            letterSpacing: (fabricObject.charSpacing || 0) / 10,
            textDecoration: fabricObject.underline ? 'underline' : (fabricObject.linethrough ? 'line-through' : ''),
            isDynamic: false,
        };
        
        // BUGFIX: Merge metadata from stored element (preserves dynamicField, textTransform, etc.)
        if (storedElement && storedElement.type === 'text') {
            const storedText = storedElement as TextElement;
            
            return {
                ...textElement,
                // CRITICAL FIX: Preserve original text (including {{field}} placeholders)
                // Without this, dragging/resizing would overwrite original text with display text
                text: storedText.text,
                isDynamic: storedText.isDynamic,
                dynamicField: storedText.dynamicField,
                textTransform: storedText.textTransform,
                backgroundEnabled: storedText.backgroundEnabled,
                backgroundColor: storedText.backgroundColor,
                backgroundCornerRadius: storedText.backgroundCornerRadius,
                backgroundPadding: storedText.backgroundPadding,
                fontProvider: storedText.fontProvider,
                shadowColor: storedText.shadowColor,
                shadowBlur: storedText.shadowBlur,
                shadowOffsetX: storedText.shadowOffsetX,
                shadowOffsetY: storedText.shadowOffsetY,
                shadowOpacity: storedText.shadowOpacity,
                stroke: storedText.stroke,
                strokeWidth: storedText.strokeWidth,
                autoFitVersion: storedText.autoFitVersion, // Preserve version
            };
        }
        
        return textElement;
    }
    
    // Handle image elements (currently rendered as Rect or FabricImage)
    if (fabricObject instanceof fabric.FabricImage) {
        const imageElement: ImageElement = {
            ...base,
            type: 'image',
            imageUrl: '',
            fitMode: 'cover',
            cornerRadius: 0,
            isDynamic: false,
        };
        
        // BUGFIX: Merge metadata from stored element (preserves dynamicSource, imageUrl, etc.)
        if (storedElement && storedElement.type === 'image') {
            const storedImage = storedElement as ImageElement;
            return {
                ...imageElement,
                imageUrl: storedImage.imageUrl,
                cropX: storedImage.cropX,
                cropY: storedImage.cropY,
                cropWidth: storedImage.cropWidth,
                cropHeight: storedImage.cropHeight,
                fitMode: storedImage.fitMode,
                cornerRadius: storedImage.cornerRadius,
                filters: storedImage.filters,
                isDynamic: storedImage.isDynamic,
                dynamicSource: storedImage.dynamicSource,
                isCanvaBackground: storedImage.isCanvaBackground,
                originalFilename: storedImage.originalFilename,
            };
        }
        
        return imageElement;
    }

    if (fabricObject instanceof fabric.Rect) {
        // Check if this is an image placeholder or actual shape
        if (storedElement && storedElement.type === 'image') {
            // This is an image element rendered as placeholder
            const storedImage = storedElement as ImageElement;
            return {
                ...base,
                type: 'image',
                imageUrl: storedImage.imageUrl,
                cropX: storedImage.cropX,
                cropY: storedImage.cropY,
                cropWidth: storedImage.cropWidth,
                cropHeight: storedImage.cropHeight,
                fitMode: storedImage.fitMode,
                cornerRadius: storedImage.cornerRadius,
                filters: storedImage.filters,
                isDynamic: storedImage.isDynamic,
                dynamicSource: storedImage.dynamicSource,
                isCanvaBackground: storedImage.isCanvaBackground,
                originalFilename: storedImage.originalFilename,
            } as ImageElement;
        }
        
        // Regular rect shape
        return {
            ...base,
            type: 'shape',
            shapeType: 'rect',
            fill: (fabricObject.fill as string) || '#000000',
            stroke: (fabricObject.stroke as string) || '',
            strokeWidth: fabricObject.strokeWidth || 0,
            cornerRadius: fabricObject.rx || 0,
        } as ShapeElement;
    }

    if (fabricObject instanceof fabric.Circle) {
        return {
            ...base,
            type: 'shape',
            shapeType: 'circle',
            fill: (fabricObject.fill as string) || '#000000',
            stroke: (fabricObject.stroke as string) || '',
            strokeWidth: fabricObject.strokeWidth || 0,
        } as ShapeElement;
    }

    return null;
}

/**
 * Load an image asynchronously and return a Fabric.js Image object
 * Handles CORS via proxy for external URLs
 * 
 * CRITICAL FIX: Uses manual HTMLImageElement preloading to ensure
 * the image is fully loaded before Fabric.js creates the FabricImage.
 * This fixes "Failed to execute 'drawImage'" TypeError in Fabric.js 6.x
 */
export async function loadFabricImage(
    imageUrl: string,
    element: ImageElement
): Promise<fabric.FabricImage | null> {
    // Handle CORS by using proxy for external URLs
    const knownCorsBlockedDomains = ['s3.tebi.io', 'tebi.io', 'amazonaws.com'];
    const needsProxy = knownCorsBlockedDomains.some(d => imageUrl.includes(d));

    const urlToLoad = needsProxy
        ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
        : imageUrl;

    /**
     * Helper function to preload image and create FabricImage
     */
    const loadImageFromUrl = (url: string): Promise<fabric.FabricImage> => {
        return new Promise((resolve, reject) => {
            const imgElement = new Image();
            imgElement.crossOrigin = 'anonymous';
            
            imgElement.onload = () => {
                try {
                    // Create FabricImage from the loaded HTMLImageElement
                    const fabricImg = new fabric.FabricImage(imgElement, {
                        left: element.x,
                        top: element.y,
                        angle: element.rotation || 0,
                        opacity: element.opacity ?? 1,
                        selectable: !element.locked,
                        evented: !element.locked,
                    });
                    
                    // Scale image to fit element dimensions
                    if (fabricImg.width && element.width) {
                        fabricImg.scaleX = element.width / fabricImg.width;
                        fabricImg.scaleY = element.height / fabricImg.height;
                    }
                    
                    resolve(fabricImg);
                } catch (err) {
                    console.error('[ObjectFactory] Error creating FabricImage:', err);
                    reject(err);
                }
            };
            
            imgElement.onerror = () => {
                console.error('[ObjectFactory] Image load error:', url.substring(0, 100));
                reject(new Error(`Failed to load image: ${url}`));
            };
            
            imgElement.src = url;
        });
    };

    try {
        const img = await loadImageFromUrl(urlToLoad);

        // Store element ID and metadata for reference
        (img as unknown as ExtendedFabricObject).id = element.id;
        (img as unknown as ExtendedFabricObject).name = element.name;
        // BUGFIX: Store complete element data for metadata preservation
        (img as unknown as ExtendedFabricObject)._elementData = element;

        // Apply corner radius if specified
        if (element.cornerRadius && element.cornerRadius > 0) {
            img.clipPath = new fabric.Rect({
                width: img.width,
                height: img.height,
                rx: element.cornerRadius / (img.scaleX || 1),
                ry: element.cornerRadius / (img.scaleY || 1),
                originX: 'center',
                originY: 'center',
            });
        }

        console.log('[ObjectFactory] Image loaded successfully:', element.id);
        return img;
    } catch (error) {
        console.error('[ObjectFactory] Failed to load image:', imageUrl, error);

        // Try with proxy if direct load failed
        if (!needsProxy) {
            try {
                const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
                const img = await loadImageFromUrl(proxyUrl);

                // Store element ID and metadata for reference
                (img as unknown as ExtendedFabricObject).id = element.id;
                (img as unknown as ExtendedFabricObject).name = element.name;
                (img as unknown as ExtendedFabricObject)._elementData = element;

                // Apply corner radius if specified
                if (element.cornerRadius && element.cornerRadius > 0) {
                    img.clipPath = new fabric.Rect({
                        width: img.width,
                        height: img.height,
                        rx: element.cornerRadius / (img.scaleX || 1),
                        ry: element.cornerRadius / (img.scaleY || 1),
                        originX: 'center',
                        originY: 'center',
                    });
                }

                console.log('[ObjectFactory] Image loaded via proxy fallback:', element.id);
                return img;
            } catch (proxyError) {
                console.error('[ObjectFactory] Proxy fallback also failed:', proxyError);
            }
        }

        return null;
    }
}
```
