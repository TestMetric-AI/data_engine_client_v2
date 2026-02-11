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

import { updateExoneratedStatus } from "@/lib/services/deposits";

export async function triggerExonerationCheckAction() {
    try {
        const affected = await updateExoneratedStatus();
        return { success: true, message: `Exoneration check completed. Updated ${affected} records.` };
    } catch (error) {
        console.error("Error in triggerExonerationCheckAction:", error);
        return { success: false, message: "Failed to run exoneration check" };
    }
}
