import { inngest } from "@/inngest/client";
import { createServiceRoleClient } from "@/lib/supabaseServer";

export const cleanupStorageFunction = inngest.createFunction(
    { id: "cleanup-storage" },
    { cron: "0 0 * * *" }, // Run daily at midnight
    async ({ step }) => {
        const supabase = createServiceRoleClient();
        const BUCKET = 'campaign-uploads';
        const RETENTION_DAYS = 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

        // Find campaigns older than retention period that still have a CSV file
        const { data: oldCampaigns, error } = await supabase
            .from('campaigns')
            .select('id, csv_url, created_at')
            .not('csv_url', 'is', null)
            .lt('created_at', cutoffDate.toISOString())
            .limit(50); // Process in small batches

        if (error) throw error;

        if (!oldCampaigns || oldCampaigns.length === 0) {
            return { message: "No old files to cleanup" };
        }

        console.log(`[Cleanup] Found ${oldCampaigns.length} old campaigns with files`);

        const cleanedCampaignIds = await step.run("delete-files", async () => {
            const successIds: string[] = [];

            for (const campaign of oldCampaigns) {
                if (!campaign.csv_url) continue;

                // Extract path from public URL
                // Format: .../storage/v1/object/public/campaign-uploads/{path}
                const urlParts = campaign.csv_url.split('/campaign-uploads/');
                if (urlParts.length !== 2) {
                    console.warn(`[Cleanup] Skipping invalid URL: ${campaign.csv_url}`);
                    continue;
                }

                const filePath = urlParts[1];

                // Delete from Supabase Storage
                const { error: deleteError } = await supabase.storage
                    .from(BUCKET)
                    .remove([filePath]);

                if (deleteError) {
                    console.error(`[Cleanup] Failed to delete file ${filePath}:`, deleteError);
                } else {
                    successIds.push(campaign.id);
                }
            }
            return successIds;
        });

        // Update database to remove the reference
        if (cleanedCampaignIds.length > 0) {
            await step.run("update-records", async () => {
                const { error: updateError } = await supabase
                    .from('campaigns')
                    .update({ csv_url: null }) // Remove reference
                    .in('id', cleanedCampaignIds);

                if (updateError) throw updateError;
            });
        }

        return { 
            processed: oldCampaigns.length, 
            cleaned: cleanedCampaignIds.length 
        };
    }
);
