import { NextRequest, NextResponse } from 'next/server';
import { deleteFontFromBlob } from '@/lib/blob';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import { cacheInvalidate } from '@/lib/redis';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/fonts/[fontId]
 * 
 * Delete a font file from storage (Blob or Supabase) and remove metadata.
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ fontId: string }> }
) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { fontId } = await params;

        if (!fontId) {
            return NextResponse.json(
                { error: 'Font ID required' },
                { status: 400 }
            );
        }

        // Get font metadata first
        const { data: font, error: fetchError } = await supabase
            .from('custom_fonts')
            .select('file_url, user_id')
            .eq('id', fontId)
            .single();

        if (fetchError || !font) {
            return NextResponse.json(
                { error: 'Font not found' },
                { status: 404 }
            );
        }

        // Security: Ensure user owns this font
        if (font.user_id !== userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Delete from storage based on URL pattern
        const fileUrl = font.file_url;
        
        if (fileUrl.includes('blob.vercel-storage.com')) {
            // Delete from Vercel Blob
            await deleteFontFromBlob(fileUrl);
            console.log('[Font Delete] Removed from Vercel Blob:', fileUrl);
        } else if (fileUrl.includes('supabase')) {
            // Delete from Supabase Storage
            const urlParts = fileUrl.split('/storage/v1/object/public/assets/');
            if (urlParts.length > 1) {
                const storagePath = urlParts[1];
                await supabase.storage.from('assets').remove([storagePath]);
                console.log('[Font Delete] Removed from Supabase:', storagePath);
            }
        }

        // Delete metadata from database
        const { error: deleteError } = await supabase
            .from('custom_fonts')
            .delete()
            .eq('id', fontId)
            .eq('user_id', userId);

        if (deleteError) {
            console.error('[Font Delete] DB delete error:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete font metadata' },
                { status: 500 }
            );
        }

        // Invalidate font cache
        await cacheInvalidate(`fonts:${userId}`);

        return NextResponse.json({
            success: true,
            message: 'Font deleted successfully',
        });

    } catch (error) {
        console.error('[Font Delete] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
