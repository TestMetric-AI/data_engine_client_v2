"use server";

import { triggerAzurePipelineForExistsDepositActivityEnrichmentDP10 } from "@/lib/services/trigger-azure-pipeline";

export async function triggerExistsDepositActivityEnrichmentAction() {
    try {
        await triggerAzurePipelineForExistsDepositActivityEnrichmentDP10();
        return { success: true, message: "Pipeline triggered successfully" };
    } catch (error) {
        console.error("Error in triggerAzurePipelineForExistsDepositActivityEnrichmentDP10:", error);
        return { success: false, message: "Failed to trigger pipeline" };
    }
}
