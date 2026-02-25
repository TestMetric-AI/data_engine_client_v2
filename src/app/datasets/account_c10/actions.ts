"use server";

import { triggerAzurePipelineForAccountCreationEnrichment } from "@/lib/services/trigger-azure-pipeline";

export async function triggerAccountCreationEnrichmentAction() {
    try {
        await triggerAzurePipelineForAccountCreationEnrichment();
        return { success: true, message: "Pipeline triggered successfully" };
    } catch (error) {
        console.error("Error in triggerAccountCreationEnrichmentAction:", error);
        return { success: false, message: "Failed to trigger pipeline" };
    }
}
