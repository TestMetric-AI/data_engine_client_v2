import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const ENDPOINT = `${process.env.AZURE_BASE_URL}${process.env.AZURE_PROJECT_NAME}/_apis/pipelines/${process.env.AZURE_PIPELINE_ID}/runs?api-version=7.1`;

const LEGAL_ENRICHMENT_DP10_PAYLOAD = {
    "resources": {
        "repositories": {
            "self": {
                "refName": "refs/heads/master"
            }
        }
    },
    "templateParameters": {
        "repository": "BHD-AutomatizacionT24JS",
        "branch": "feat/portal-script",
        "command": "npx playwright test --grep @legal-enrichment-dp10 --project chromium"
    }
};


const INTEREST_TYPE_ENRICHMENT_DP10_PAYLOAD = {
    "resources": {
        "repositories": {
            "self": {
                "refName": "refs/heads/master"
            }
        }
    },
    "templateParameters": {
        "repository": "BHD-AutomatizacionT24JS",
        "branch": "feat/portal-script",
        "command": "npx playwright test --grep @interest-type-enrichment --project chromium"
    }
};

const EXISTS_DEPOSIT_ACTIVITY_ENRICHMENT_DP10_PAYLOAD = {
    "resources": {
        "repositories": {
            "self": {
                "refName": "refs/heads/master"
            }
        }
    },
    "templateParameters": {
        "repository": "BHD-AutomatizacionT24JS",
        "branch": "feat/portal-script",
        "command": "npx playwright test --grep @exists-deposit-activity-enrichment --project chromium"
    }
};


export async function triggerAzurePipelineForLegalEnrichmentDP10() {
    console.log("Triggering Azure Pipeline");
    try {
        const response = await axios.post(ENDPOINT, LEGAL_ENRICHMENT_DP10_PAYLOAD, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${Buffer.from(`:${process.env.AZURE_PATH}`).toString('base64')}`,
            },
        });
        console.log("Azure Pipeline Triggered Successfully");
        console.log(response.data);
    } catch (error: any) {
        console.error("Error Triggering Azure Pipeline");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

export async function triggerAzurePipelineForInterestTypeEnrichmentDP10() {
    console.log("Triggering Azure Pipeline");
    try {
        const response = await axios.post(ENDPOINT, INTEREST_TYPE_ENRICHMENT_DP10_PAYLOAD, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${Buffer.from(`:${process.env.AZURE_PATH}`).toString('base64')}`,
            },
        });
        console.log("Azure Pipeline Triggered Successfully");
        console.log(response.data);
    } catch (error: any) {
        console.error("Error Triggering Azure Pipeline");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

export async function triggerAzurePipelineForExistsDepositActivityEnrichmentDP10() {
    console.log("Triggering Azure Pipeline");
    try {
        const response = await axios.post(ENDPOINT, EXISTS_DEPOSIT_ACTIVITY_ENRICHMENT_DP10_PAYLOAD, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${Buffer.from(`:${process.env.AZURE_PATH}`).toString('base64')}`,
            },
        });
        console.log("Azure Pipeline Triggered Successfully");
        console.log(response.data);
    } catch (error: any) {
        console.error("Error Triggering Azure Pipeline");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}