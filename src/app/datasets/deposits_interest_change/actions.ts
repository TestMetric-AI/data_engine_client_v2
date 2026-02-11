"use server";

import { triggerAzurePipelineForInterestTypeEnrichmentDP10 } from "@/lib/services/trigger-azure-pipeline";

export async function triggerInterestTypeEnrichmentAction() {
    try {
        await triggerAzurePipelineForInterestTypeEnrichmentDP10();
        return { success: true, message: "Pipeline triggered successfully" };
    } catch (error) {
        console.error("Error in triggerInterestTypeEnrichmentAction:", error);
        return { success: false, message: "Failed to trigger pipeline" };
    }
}
