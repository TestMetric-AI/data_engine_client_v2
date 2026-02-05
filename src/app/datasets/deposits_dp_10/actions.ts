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
