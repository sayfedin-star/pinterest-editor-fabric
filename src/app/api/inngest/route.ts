import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { renderBatchFunction } from "@/inngest/functions/renderBatch";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    renderBatchFunction,
  ],
});
