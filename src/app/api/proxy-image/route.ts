import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/proxy-image?url=...
 * Proxy images from external URLs to bypass CORS restrictions
 */
export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json(
            { error: 'Missing url parameter' },
            { status: 400 }
        );
    }

    try {
        // Basic URL validation
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch {
            return NextResponse.json(
                { error: 'Invalid URL format' },
                { status: 400 }
            );
        }

        // Only allow http/https protocols
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return NextResponse.json(
                { error: 'Only HTTP/HTTPS URLs allowed' },
                { status: 400 }
            );
        }

        // Fetch with timeout to prevent hanging requests
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch image' },
                { status: response.status }
            );
        }

        // Check content length to prevent memory exhaustion
        const contentLength = parseInt(response.headers.get('content-length') || '0');
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (contentLength > MAX_SIZE) {
            return NextResponse.json(
                { error: 'Image too large (max 10MB)' },
                { status: 413 }
            );
        }

        // Get content type
        const contentType = response.headers.get('content-type') || 'image/png';

        // Get image data
        const imageBuffer = await response.arrayBuffer();

        // Return image with proper headers
        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            return NextResponse.json(
                { error: 'Request timeout' },
                { status: 504 }
            );
        }
        console.error('[proxy-image] Error:', error);
        return NextResponse.json(
            { error: 'Failed to proxy image' },
            { status: 500 }
        );
    }
}
