// Canvas Utilities for Thumbnail Generation and Export
// Works with Fabric Canvas to generate thumbnails and export images

import * as fabric from 'fabric';
import { supabase } from './supabase';

export interface ThumbnailOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0-1 for JPEG
    format?: 'png' | 'jpeg';
}

const DEFAULT_THUMBNAIL_OPTIONS: ThumbnailOptions = {
    maxWidth: 400,  // Increased for better quality
    maxHeight: 600, // Better aspect ratio for Pinterest pins
    quality: 0.95,  // Higher quality
    format: 'png',
};

/**
 * Generate a thumbnail from a Fabric Canvas
 * @param canvas Fabric Canvas reference
 * @param options Thumbnail generation options
 * @returns Base64 data URL of the thumbnail
 */
export function generateThumbnail(
    canvas: fabric.Canvas | fabric.StaticCanvas | null,
    options: ThumbnailOptions = {}
): string | null {
    try {
        if (!canvas) {
            console.warn('generateThumbnail: No canvas provided');
            return null;
        }

        const opts = { ...DEFAULT_THUMBNAIL_OPTIONS, ...options };

        // Force render all objects to ensure thumbnail includes everything
        canvas.renderAll();

        // Get original dimensions
        const originalWidth = canvas.getWidth();
        const originalHeight = canvas.getHeight();

        if (originalWidth === 0 || originalHeight === 0) {
            console.warn('generateThumbnail: Canvas has zero dimensions');
            return null;
        }

        // Calculate scale to fit thumbnail dimensions while maintaining aspect ratio
        const scaleX = (opts.maxWidth || 400) / originalWidth;
        const scaleY = (opts.maxHeight || 600) / originalHeight;
        const scale = Math.min(scaleX, scaleY, 1); // Never scale up, only down

        // Use higher multiplier for crisp thumbnails (min 1.5 for retina)
        const multiplier = Math.max(scale * 2, 1);

        // Generate data URL using Fabric's toDataURL with white background
        const format = opts.format === 'jpeg' ? 'jpeg' : 'png';
        
        // Ensure canvas has a background color for thumbnail
        const originalBg = canvas.backgroundColor;
        if (!originalBg || originalBg === 'transparent') {
            canvas.backgroundColor = '#ffffff';
            canvas.renderAll();
        }
        
        const dataUrl = canvas.toDataURL({
            format,
            quality: opts.quality,
            multiplier,
            enableRetinaScaling: true,
        });

        // Restore original background
        if (!originalBg || originalBg === 'transparent') {
            canvas.backgroundColor = originalBg;
            canvas.renderAll();
        }

        console.log('[canvasUtils] Thumbnail generated:', {
            originalSize: `${originalWidth}x${originalHeight}`,
            multiplier,
            format,
            dataUrlLength: dataUrl?.length || 0
        });

        return dataUrl;
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        return null;
    }
}

/**
 * Generate a full-size export from a Fabric Canvas
 * @param canvas Fabric Canvas reference
 * @param multiplier Multiplier for export quality (default: 2 for retina)
 * @returns Base64 data URL of the export
 */
export function generateExport(
    canvas: fabric.Canvas | fabric.StaticCanvas | null,
    multiplier: number = 2
): string | null {
    try {
        if (!canvas) {
            console.warn('generateExport: No canvas provided');
            return null;
        }

        const dataUrl = canvas.toDataURL({
            format: 'png',
            multiplier,
        });

        return dataUrl;
    } catch (error) {
        console.error('Error generating export:', error);
        return null;
    }
}

/**
 * Convert a data URL to a Blob
 * @param dataUrl Base64 data URL
 * @returns Blob or null on error
 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
    try {
        const parts = dataUrl.split(',');
        if (parts.length !== 2) {
            return null;
        }

        const mimeMatch = parts[0].match(/:(.*?);/);
        if (!mimeMatch) {
            return null;
        }

        const mime = mimeMatch[1];
        const binaryString = atob(parts[1]);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return new Blob([bytes], { type: mime });
    } catch (error) {
        console.error('Error converting data URL to blob:', error);
        return null;
    }
}

/**
 * Extract base64 data from a data URL (removes the prefix)
 * @param dataUrl Full data URL
 * @returns Base64 string or null on error
 */
export function extractBase64(dataUrl: string): string | null {
    try {
        const parts = dataUrl.split(',');
        return parts.length === 2 ? parts[1] : null;
    } catch (error) {
        console.error('Error extracting base64:', error);
        return null;
    }
}

/**
 * Upload thumbnail to server via API
 * @param templateId Template ID
 * @param userId User ID
 * @param dataUrl Base64 data URL of the thumbnail
 * @returns URL of uploaded thumbnail or null on error
 */
export async function uploadThumbnail(
    templateId: string,
    userId: string,
    dataUrl: string
): Promise<string | null> {
    try {
        // Get current session token
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/upload-thumbnail', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                templateId,
                userId,
                imageData: dataUrl,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Upload failed:', error);
            return null;
        }

        const result = await response.json();
        return result.url;
    } catch (error) {
        console.error('Error uploading thumbnail:', error);
        return null;
    }
}

/**
 * Delete template assets from server
 * @param templateId Template ID
 * @param userId User ID
 * @returns true on success, false on error
 */
export async function deleteTemplateAssets(
    templateId: string,
    userId: string
): Promise<boolean> {
    try {
        // Get current session token
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/delete-assets', {
            method: 'DELETE',
            headers,
            body: JSON.stringify({
                type: 'thumbnail',
                userId,
                templateId,
            }),
        });

        return response.ok;
    } catch (error) {
        console.error('Error deleting template assets:', error);
        return false;
    }
}
