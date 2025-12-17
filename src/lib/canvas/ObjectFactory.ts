/**
 * ObjectFactory
 * 
 * Creates and syncs Fabric.js objects from/to Element data.
 * Extracted from CanvasManager for single responsibility.
 */

import * as fabric from 'fabric';
import { Element, TextElement, ShapeElement, ImageElement } from '@/types/editor';

/**
 * Create a Fabric.js object from an Element
 */
export function createFabricObject(element: Element): fabric.FabricObject | null {
    let obj: fabric.FabricObject | null = null;

    switch (element.type) {
        case 'text': {
            const textEl = element as TextElement;
            obj = new fabric.Textbox(textEl.text || '', {
                left: element.x,
                top: element.y,
                width: element.width,
                fontSize: textEl.fontSize || 16,
                fontFamily: textEl.fontFamily || 'Arial',
                fill: textEl.fill || '#000000',
                textAlign: textEl.align || 'left',
            });
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
                (obj as any)._needsAsyncImageLoad = true;
                (obj as any)._imageUrl = imageUrl;
                (obj as any)._element = element;
            } else {
                // No URL - show empty placeholder
                obj = new fabric.Rect({
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    fill: '#f3f4f6',
                    stroke: '#d1d5db',
                    strokeWidth: 2,
                    strokeDashArray: [8, 4],
                });
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
        (obj as any).id = element.id;
        (obj as any).name = element.name;

        // Apply common properties
        obj.set({
            angle: element.rotation || 0,
            opacity: element.opacity ?? 1,
            selectable: !element.locked,
            evented: !element.locked,
        });
    }

    return obj;
}

/**
 * Sync element updates to an existing Fabric object
 */
export function syncElementToFabric(
    fabricObject: fabric.FabricObject,
    updates: Partial<Element>
): void {
    const props: Record<string, unknown> = {};

    if (updates.x !== undefined) props.left = updates.x;
    if (updates.y !== undefined) props.top = updates.y;
    if (updates.width !== undefined) props.width = updates.width;
    if (updates.height !== undefined) props.height = updates.height;
    if (updates.rotation !== undefined) props.angle = updates.rotation;
    if (updates.opacity !== undefined) props.opacity = updates.opacity;
    if (updates.locked !== undefined) {
        props.selectable = !updates.locked;
        props.evented = !updates.locked;
    }

    fabricObject.set(props);
}

/**
 * Extract Element data from a Fabric object
 */
export function syncFabricToElement(fabricObject: fabric.FabricObject): Element | null {
    const id = (fabricObject as any).id;
    const name = (fabricObject as any).name || 'Untitled';

    if (!id) {
        console.warn('[ObjectFactory] Fabric object missing ID');
        return null;
    }

    // Base properties common to all elements
    const base = {
        id,
        name,
        x: fabricObject.left || 0,
        y: fabricObject.top || 0,
        width: fabricObject.width || 0,
        height: fabricObject.height || 0,
        rotation: fabricObject.angle || 0,
        opacity: fabricObject.opacity ?? 1,
        locked: !fabricObject.selectable,
        visible: fabricObject.visible !== false,
        zIndex: 0, // Calculated from canvas order
    };

    // Type-specific properties
    if (fabricObject instanceof fabric.Textbox) {
        return {
            ...base,
            type: 'text',
            text: fabricObject.text || '',
            fontFamily: fabricObject.fontFamily || 'Arial',
            fontSize: fabricObject.fontSize || 16,
            fontStyle: 'normal',
            fill: (fabricObject.fill as string) || '#000000',
            align: (fabricObject.textAlign as 'left' | 'center' | 'right') || 'left',
            verticalAlign: 'top',
            lineHeight: 1.2,
            letterSpacing: 0,
            textDecoration: '',
            isDynamic: false,
        } as TextElement;
    }

    if (fabricObject instanceof fabric.Rect) {
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

    try {
        const img = await fabric.FabricImage.fromURL(urlToLoad, {
            crossOrigin: 'anonymous'
        });

        // Scale image to fit element dimensions
        if (img.width && element.width) {
            img.scaleX = element.width / img.width;
            img.scaleY = element.height / img.height;
        }

        // Set position and other properties
        img.set({
            left: element.x,
            top: element.y,
            angle: element.rotation || 0,
            opacity: element.opacity ?? 1,
            selectable: !element.locked,
            evented: !element.locked,
        });

        // Store element ID for reference
        (img as any).id = element.id;
        (img as any).name = element.name;

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
                const img = await fabric.FabricImage.fromURL(proxyUrl, {
                    crossOrigin: 'anonymous'
                });

                if (img.width && element.width) {
                    img.scaleX = element.width / img.width;
                    img.scaleY = element.height / img.height;
                }

                img.set({
                    left: element.x,
                    top: element.y,
                    angle: element.rotation || 0,
                    opacity: element.opacity ?? 1,
                });

                (img as any).id = element.id;
                (img as any).name = element.name;

                console.log('[ObjectFactory] Image loaded via proxy fallback:', element.id);
                return img;
            } catch (proxyError) {
                console.error('[ObjectFactory] Proxy fallback also failed:', proxyError);
            }
        }

        return null;
    }
}
