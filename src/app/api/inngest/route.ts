import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { renderBatchFunction } from "@/inngest/functions/renderBatch";
import { cleanupStorageFunction } from "@/inngest/functions/cleanupStorage";

// Vercel configuration - allow long-running Inngest functions
// Pro plan: up to 300s, Hobby: up to 60s
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    renderBatchFunction,
    cleanupStorageFunction,
  ],
});
