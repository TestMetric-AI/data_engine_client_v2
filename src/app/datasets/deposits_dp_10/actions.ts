"use server";

import { triggerAzurePipeline } from "@/lib/services/trigger-azure-pipeline";

export async function triggerLegalEnrichmentAction() {
    try {
        await triggerAzurePipeline();
        return { success: true, message: "Pipeline triggered successfully" };
    } catch (error) {
        console.error("Error in triggerLegalEnrichmentAction:", error);
        return { success: false, message: "Failed to trigger pipeline" };
    }
}
