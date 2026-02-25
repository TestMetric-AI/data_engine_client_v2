import axios from "axios";

// ── Pipeline configuration ─────────────────────────────────────────

const ENDPOINT = `${process.env.AZURE_BASE_URL}${process.env.AZURE_PROJECT_NAME}/_apis/pipelines/${process.env.AZURE_PIPELINE_ID}/runs?api-version=7.1`;

function buildPayload(grepTag: string) {
    return {
        resources: {
            repositories: {
                self: {
                    refName: "refs/heads/master",
                },
            },
        },
        templateParameters: {
            repository: "BHD-AutomatizacionT24JS",
            branch: "feat/portal-script",
            command: `npx playwright test --grep ${grepTag} --project chromium`,
        },
    };
}

function getAuthHeader(): string {
    return `Basic ${Buffer.from(`:${process.env.AZURE_PAT}`).toString("base64")}`;
}

// ── Generic trigger ────────────────────────────────────────────────

/**
 * Trigger an Azure DevOps pipeline run for the given Playwright grep tag.
 *
 * @param grepTag - The `--grep` value passed to Playwright (e.g. `@legal-enrichment-dp10`)
 * @throws Re-throws the underlying axios error after logging
 */
export async function triggerAzurePipeline(grepTag: string): Promise<void> {
    console.log(`Triggering Azure Pipeline for: ${grepTag}`);
    try {
        const response = await axios.post(ENDPOINT, buildPayload(grepTag), {
            headers: {
                "Content-Type": "application/json",
                Authorization: getAuthHeader(),
            },
        });
        console.log("Azure Pipeline Triggered Successfully");
        console.log(response.data);
    } catch (error: unknown) {
        console.error(`Error Triggering Azure Pipeline for: ${grepTag}`);
        if (axios.isAxiosError(error) && error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else if (error instanceof Error) {
            console.error(error.message);
        }
        throw error;
    }
}

// ── Named convenience exports (backward-compatible) ────────────────

export const triggerAzurePipelineForLegalEnrichmentDP10 = () =>
    triggerAzurePipeline("@legal-enrichment-dp10");

export const triggerAzurePipelineForInterestTypeEnrichmentDP10 = () =>
    triggerAzurePipeline("@interest-type-enrichment");

export const triggerAzurePipelineForExistsDepositActivityEnrichmentDP10 = () =>
    triggerAzurePipeline("@exists-deposit-activity-enrichment");

export const triggerAzurePipelineForAccountCreationEnrichment = () =>
    triggerAzurePipeline("@account-creation-enrichment");