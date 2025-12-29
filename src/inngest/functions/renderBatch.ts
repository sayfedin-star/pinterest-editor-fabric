import { inngest } from "@/inngest/client";
import Papa from 'papaparse';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { Element, ImageElement } from '@/types/editor';
import { setupFabricServerPolyfills } from '@/lib/fabric/server-polyfill';
import { createServiceRoleClient } from "@/lib/supabaseServer";

// Define types locally since we are extracting logic
interface RenderBatchEventData {
    campaignId: string;
    elements?: Element[];
    canvasSize?: { width: number; height: number };
    backgroundColor?: string;
    fieldMapping?: Record<string, string>;
    csvRows?: Record<string, string>[];
    startIndex?: number;
}

// Initialize S3 Client for Tebi
const getS3Client = () => {
    // Handle TEBI_ENDPOINT with or without https:// prefix
    const rawEndpoint = process.env.TEBI_ENDPOINT || '';
    const endpoint = rawEndpoint.startsWith('https://') || rawEndpoint.startsWith('http://')
        ? rawEndpoint
        : `https://${rawEndpoint}`;
    
    return new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
            accessKeyId: process.env.TEBI_ACCESS_KEY!,
            secretAccessKey: process.env.TEBI_SECRET_KEY!,
        },
        forcePathStyle: true,
    });
};

// Upload to S3
async function uploadToS3(
    s3Client: S3Client,
    buffer: Buffer,
    campaignId: string,
    pinIndex: number
): Promise<string> {
    const bucket = process.env.TEBI_BUCKET!;
    const key = `campaigns/${campaignId}/pin-${pinIndex}-${uuidv4().substring(0, 8)}.jpg`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: 'image/jpeg',
            ACL: 'public-read',
        })
    );

    // Generate public URL - handle TEBI_ENDPOINT with or without https://
    const rawEndpoint = process.env.TEBI_ENDPOINT || '';
    const baseUrl = rawEndpoint.startsWith('https://') || rawEndpoint.startsWith('http://')
        ? rawEndpoint
        : `https://${rawEndpoint}`;
    return `${baseUrl}/${bucket}/${key}`;
}

export const renderBatchFunction = inngest.createFunction(
    { 
        id: "render-batch-campaign",
        concurrency: {
            limit: 2, // Limit concurrent campaigns processing to avoid memory exhaustion
        }
    },
    { event: "campaign/render.requested" },
    async ({ event, step }) => {
        let {
            campaignId,
            elements,
            canvasSize,
            backgroundColor,
            fieldMapping,
            csvRows,
            startIndex = 0,
        } = event.data as RenderBatchEventData;

        // Validation
        if (!campaignId) {
            throw new Error("Missing required field: campaignId");
        }

        const supabase = createServiceRoleClient();
        
        // 1. Fetch Campaign and Template Data if missing
        if (!elements || !canvasSize || !csvRows || !fieldMapping) {
             const { data: campaign, error: campaignError } = await supabase
                .from('campaigns')
                .select(`
                    user_id,
                    template_id,
                    csv_data,
                    csv_url,
                    field_mapping,
                    templates (
                        elements,
                        canvas_size,
                        background_color
                    )
                `)
                .eq('id', campaignId)
                .single();

            if (campaignError || !campaign) {
                throw new Error(`Campaign not found: ${campaignError?.message}`);
            }

            // Fill in missing data from DB
            if (!csvRows) csvRows = campaign.csv_data as Record<string, string>[];
            
            // Download CSV if URL is present (and rows are empty)
            if ((!csvRows || csvRows.length === 0) && (campaign as any).csv_url) {
                try {
                    const csvUrl = (campaign as any).csv_url;
                    console.log(`[Inngest Render] Downloading CSV from ${csvUrl}`);
                    const response = await fetch(csvUrl);
                    if (response.ok) {
                        const csvText = await response.text();
                        const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });
                        if (parseResult.data && parseResult.data.length > 0) {
                            csvRows = parseResult.data as Record<string, string>[];
                            console.log(`[Inngest Render] Downloaded and parsed ${csvRows.length} rows`);
                        }
                    } else {
                         console.error(`[Inngest Render] Failed to download CSV: ${response.status} ${response.statusText}`);
                    }
                } catch (e) {
                    console.error('[Inngest Render] Error fetching/parsing CSV:', e);
                }
            }

            if (!fieldMapping) fieldMapping = campaign.field_mapping as Record<string, string>;
            
            // Handle join structure
            const template = campaign.templates as unknown as { elements: Element[], canvas_size: { width: number, height: number }, background_color: string };
            
            if (template) {
                if (!elements) elements = template.elements;
                if (!canvasSize) canvasSize = template.canvas_size;
                if (!backgroundColor) backgroundColor = template.background_color;
            } else {
                 throw new Error("Template linked to campaign not found");
            }

             // We need userId for saving results later
             // But wait, userId is local to this scope if we declare it here?
             // No, let's just use the campaign.user_id we fetched.
        }

        // Re-validate after fetching
        if (!elements || !canvasSize || !csvRows || csvRows.length === 0) {
            throw new Error("Missing required fields (even after DB fetch)");
        }
        
        // Ensure defaults
        if (!fieldMapping) fieldMapping = {};
        if (!backgroundColor) backgroundColor = '#ffffff';
        
        // We need userId for saving results, fetch it if we didn't fetch campaign above
        let userId = '';
        if (!userId) {
             const { data: campaignUser, error: userError } = await supabase
                .from('campaigns')
                .select('user_id')
                .eq('id', campaignId)
                .single();
             
             if (userError || !campaignUser) {
                  // If we fetched campaign above, we have user_id. 
                  // But TS doesn't know that if we didn't assign it to a variable visible here.
                  // Let's refactor slightly to ensure userId is available.
                  // Wait, I can't easily access the 'campaign' variable from the if block above.
                  // I will re-fetch simply or structure the code to ensure userId is fetched.
                  
                  // Actually, let's just fetch it if it's not set.
                  // If we entered the if block, we have it.
                  // If we didn't enter the if block, we still need it.
                  // The previous code always fetched it.
                  
                  const { data: simpleCampaign, error: simpleError } = await supabase
                    .from('campaigns')
                    .select('user_id')
                    .eq('id', campaignId)
                    .single();
                    
                  if (simpleError || !simpleCampaign) throw new Error("User ID not found");
                  userId = simpleCampaign.user_id;
             } else {
                 userId = campaignUser.user_id;
             }
        }

        // 2. Perform Rendering (Logic from route.ts)
        const results = await step.run("render-and-upload", async () => {
             // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STEP 1: Setup polyfills BEFORE importing fabric
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            setupFabricServerPolyfills();

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STEP 2: Dynamic import of fabric-dependent modules
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            const { renderTemplate, setServerImageCache, clearServerImageCache, getDynamicImageUrl } = await import('@/lib/fabric/engine');
            const { prepareElementsForServerRendering } = await import('@/lib/fabric/serverEngine');
            const { CanvasPool } = await import('@/lib/fabric/CanvasPool');

             // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // FONT FIX
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            
            const preparedElements = await prepareElementsForServerRendering(elements, supabaseUrl, supabaseKey);

            console.log(`[Inngest Render] Processing batch of ${csvRows.length} pins for campaign ${campaignId}`);

            const s3Client = getS3Client();
            const batchResults = [];

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // PHASE 1: Create canvas pool
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // Using a safe limit for serverless environment
            const PARALLEL_LIMIT = 2; 
            const canvasPool = new CanvasPool(PARALLEL_LIMIT, canvasSize!.width, canvasSize!.height);

            try {
                // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                // OPTIMIZATION: Pre-load unique images
                // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                const imageCache = new Map<string, string>();
                const imageElements = preparedElements.filter(el => el.type === 'image' && el.visible);
                const uniqueUrls = new Set<string>();
                
                for (const el of imageElements) {
                    const imgEl = el as ImageElement;
                    
                    if (imgEl.isDynamic) {
                        for (const row of csvRows!) {
                            const url = getDynamicImageUrl(imgEl, row, fieldMapping!);
                            if (url) uniqueUrls.add(url);
                        }
                    } else {
                        const url = getDynamicImageUrl(imgEl, {}, {});
                        if (url) uniqueUrls.add(url);
                    }
                }
                
                // Pre-fetch images with concurrency limit to avoid EMFILE
                const uniqueUrlArray = Array.from(uniqueUrls);
                const IMAGE_CONCURRENCY = 20;
                
                for (let i = 0; i < uniqueUrlArray.length; i += IMAGE_CONCURRENCY) {
                    const chunk = uniqueUrlArray.slice(i, i + IMAGE_CONCURRENCY);
                    await Promise.all(chunk.map(async (url) => {
                        try {
                            let fetchUrl = url;
                            if (url.startsWith('/api/proxy-image')) {
                                const urlParams = new URLSearchParams(url.split('?')[1] || '');
                                const originalUrl = urlParams.get('url');
                                if (originalUrl) fetchUrl = decodeURIComponent(originalUrl);
                            }
                            
                            const response = await fetch(fetchUrl, {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                    'Accept': 'image/*',
                                },
                            });
                            
                            if (response.ok) {
                                const arrayBuffer = await response.arrayBuffer();
                                const base64 = Buffer.from(arrayBuffer).toString('base64');
                                const contentType = response.headers.get('content-type') || 'image/png';
                                imageCache.set(url, `data:${contentType};base64,${base64}`);
                            }
                        } catch (e) {
                            console.warn(`[Inngest Render] Image prefetch failed: ${url}`, e);
                        }
                    }));
                }
                
                setServerImageCache(imageCache);

                // Render function
                async function renderSinglePin(rowData: Record<string, string>, pinIndex: number): Promise<Buffer> {
                    const canvas = canvasPool.acquire();
                    try {
                        const config = {
                            width: canvasSize!.width,
                            height: canvasSize!.height,
                            backgroundColor,
                            interactive: false,
                        };

                        await renderTemplate(canvas, preparedElements, config, rowData, fieldMapping);
                        
                        const dataUrl = canvas.toDataURL({
                            format: 'jpeg',
                            quality: 0.85,
                            multiplier: 1,
                        });

                        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
                        return Buffer.from(base64Data, 'base64');
                    } finally {
                        canvasPool.release(canvas);
                    }
                }

                // Process pins
                // We process in chunks to allow for some intermediate updates if we wanted, 
                // but for now we do it all in one 'step' to avoid serializing huge data between steps.
                for (let i = 0; i < csvRows.length; i += PARALLEL_LIMIT) {
                    const chunk = csvRows.slice(i, i + PARALLEL_LIMIT);
                    const chunkPromises = chunk.map(async (rowData, chunkIndex) => {
                        const pinIndex = startIndex + i + chunkIndex;
                        try {
                            const buffer = await renderSinglePin(rowData, pinIndex);
                            const url = await uploadToS3(s3Client, buffer, campaignId, pinIndex);
                            
                            return {
                                index: pinIndex,
                                success: true,
                                url,
                                rowData,
                            };
                        } catch (error) {
                            console.error(`[Inngest Render] Pin ${pinIndex} failed:`, error);
                            return {
                                index: pinIndex,
                                success: false,
                                error: error instanceof Error ? error.message : 'Unknown error',
                                rowData,
                            };
                        }
                    });

                    const chunkResults = await Promise.all(chunkPromises);
                    batchResults.push(...chunkResults);
                }

                return batchResults;

            } finally {
                canvasPool.cleanup();
                clearServerImageCache();
            }
        });

        // 3. Save Results to Supabase
        await step.run("save-results", async () => {
            const successResults = results.filter(r => r.success);
            
            // Insert generated pins
            if (successResults.length > 0) {
                 const { error } = await supabase.from('generated_pins').insert(
                    successResults.map(r => ({
                        campaign_id: campaignId,
                        user_id: userId,
                        data_row: { ...r.rowData, rowIndex: r.index },
                        image_url: (r as any).url,
                        status: 'generated'
                    }))
                );
                
                if (error) throw error;
            }

            // Update campaign stats
            const currentGeneratedCount = successResults.length;
            
            // Fetch current count to increment correctly (atomic increment would be better but this is fine for now)
            // Or better: Supabase doesn't have direct increment in JS client without rpc.
            // We can just update with the count we have if we assume we are the only one processing.
            // But since we might be re-running, let's be careful.
            // Actually, for this "batch", we generated X pins.
            // We should update the campaign status to completed if this was the whole batch.
            // Assuming this function handles the WHOLE CSV as passed in event.
            
            await supabase.from('campaigns')
                .update({
                    status: 'completed',
                    generated_pins: csvRows.length, // Or cumulative if we split. For now assuming full batch.
                    completed_at: new Date().toISOString()
                })
                .eq('id', campaignId);
        });

        return { success: true, count: results.length };
    }
);
