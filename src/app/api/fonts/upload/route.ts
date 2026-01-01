import { NextRequest, NextResponse } from 'next/server';
import { uploadFontToBlob, isBlobConfigured } from '@/lib/blob';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import { cacheInvalidate } from '@/lib/redis';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB max

export const dynamic = 'force-dynamic';

/**
 * POST /api/fonts/upload
 * 
 * Upload a font file to Vercel Blob (edge-fast) with Supabase fallback.
 * Stores metadata in the custom_fonts table.
 */
export async function POST(req: NextRequest) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const family = formData.get('family') as string | null;
        const category = formData.get('category') as string | null;

        if (!file || !family || !category) {
            return NextResponse.json(
                { error: 'Missing required fields: file, family, category' },
                { status: 400 }
            );
        }

        // Validate file extension
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!extension || !['ttf', 'otf', 'woff', 'woff2'].includes(extension)) {
            return NextResponse.json(
                { error: 'Unsupported font format. Use ttf, otf, woff, or woff2' },
                { status: 400 }
            );
        }

        // Validate file size (5MB max)
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `Font file too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
                { status: 400 }
            );
        }

        // Validate category
        const validCategories = ['sans-serif', 'serif', 'display', 'script', 'handwriting', 'monospace'];
        if (!validCategories.includes(category)) {
            return NextResponse.json(
                { error: 'Invalid category' },
                { status: 400 }
            );
        }

        // Get content type
        const contentTypeMap: Record<string, string> = {
            'ttf': 'font/ttf',
            'otf': 'font/otf',
            'woff': 'font/woff',
            'woff2': 'font/woff2',
        };
        const contentType = contentTypeMap[extension];

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let fileUrl: string;

        // Try Vercel Blob first (faster edge delivery)
        if (isBlobConfigured()) {
            const filename = `${userId}/${Date.now()}_${file.name}`;
            const result = await uploadFontToBlob(filename, buffer, contentType);
            
            if (result) {
                fileUrl = result.url;
                console.log('[Font Upload] Stored in Vercel Blob:', fileUrl);
            } else {
                return NextResponse.json(
                    { error: 'Failed to upload font to Blob' },
                    { status: 500 }
                );
            }
        } else {
            // Fallback to Supabase Storage
            const storagePath = `fonts/${userId}/${Date.now()}_${file.name}`;
            
            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(storagePath, buffer, {
                    contentType,
                    cacheControl: '31536000', // 1 year cache
                    upsert: false,
                });

            if (uploadError) {
                console.error('[Font Upload] Supabase upload error:', uploadError);
                return NextResponse.json(
                    { error: 'Failed to upload font' },
                    { status: 500 }
                );
            }

            const { data: urlData } = supabase.storage
                .from('assets')
                .getPublicUrl(storagePath);
            
            fileUrl = urlData.publicUrl;
            console.log('[Font Upload] Stored in Supabase:', fileUrl);
        }

        // Save metadata to database
        const { data: font, error: dbError } = await supabase
            .from('custom_fonts')
            .insert({
                user_id: userId,
                family,
                file_url: fileUrl,
                format: extension,
                category,
                file_size: file.size,
            })
            .select()
            .single();

        if (dbError) {
            console.error('[Font Upload] DB insert error:', dbError);
            return NextResponse.json(
                { error: 'Failed to save font metadata' },
                { status: 500 }
            );
        }

        // Invalidate font cache so new font appears immediately
        await cacheInvalidate(`fonts:${userId}`);

        return NextResponse.json({
            success: true,
            font,
            storage: isBlobConfigured() ? 'vercel-blob' : 'supabase',
        });

    } catch (error) {
        console.error('[Font Upload] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
