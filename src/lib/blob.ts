/**
 * Vercel Blob Storage Utilities
 * 
 * Purpose: Store "hot" assets (fonts) on Vercel's edge network for fast loading.
 * Layer 1 of the hybrid storage architecture.
 * 
 * Usage: ~5MB for custom fonts
 * Limit: 1GB storage, 10K ops/month (Hobby plan)
 */

import { put, del, list, head } from '@vercel/blob';

// =============================================================================
// FONT OPERATIONS
// =============================================================================

export interface BlobUploadResult {
    url: string;
    pathname: string;
    contentType: string;
    size: number;
}

/**
 * Upload a font file to Vercel Blob
 * 
 * @param filename - Font filename (e.g., "my-font.woff2")
 * @param fileBuffer - Font file as Buffer
 * @param contentType - MIME type (e.g., "font/woff2")
 * @returns Blob URL for the uploaded font
 */
export async function uploadFontToBlob(
    filename: string,
    fileBuffer: Buffer,
    contentType: string
): Promise<BlobUploadResult | null> {
    try {
        const blob = await put(`fonts/${filename}`, fileBuffer, {
            access: 'public',
            contentType,
            addRandomSuffix: false, // Keep predictable URLs
        });

        console.log(`[Blob] Uploaded font: ${blob.url}`);

        return {
            url: blob.url,
            pathname: blob.pathname,
            contentType: blob.contentType,
            size: fileBuffer.length,
        };
    } catch (error) {
        console.error('[Blob] Failed to upload font:', error);
        return null;
    }
}

/**
 * Delete a font from Vercel Blob
 */
export async function deleteFontFromBlob(url: string): Promise<boolean> {
    try {
        await del(url);
        console.log(`[Blob] Deleted font: ${url}`);
        return true;
    } catch (error) {
        console.error('[Blob] Failed to delete font:', error);
        return false;
    }
}

/**
 * List all fonts in Vercel Blob
 */
export async function listFontsInBlob(): Promise<string[]> {
    try {
        const { blobs } = await list({ prefix: 'fonts/' });
        return blobs.map(b => b.url);
    } catch (error) {
        console.error('[Blob] Failed to list fonts:', error);
        return [];
    }
}

/**
 * Check if a font exists in Blob
 */
export async function fontExistsInBlob(url: string): Promise<boolean> {
    try {
        await head(url);
        return true;
    } catch {
        return false;
    }
}

// =============================================================================
// HELPER - Check if Blob is configured
// =============================================================================

/**
 * Check if Vercel Blob is configured
 * Requires BLOB_READ_WRITE_TOKEN environment variable
 */
export function isBlobConfigured(): boolean {
    return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Get Blob token status (for debugging)
 */
export function getBlobStatus(): { configured: boolean; message: string } {
    if (isBlobConfigured()) {
        return { configured: true, message: 'Vercel Blob is configured' };
    }
    return { 
        configured: false, 
        message: 'BLOB_READ_WRITE_TOKEN not set - fonts will use fallback storage' 
    };
}
