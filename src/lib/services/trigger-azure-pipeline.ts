import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const ENDPOINT = `${process.env.AZURE_BASE_URL}${process.env.AZURE_PROJECT_NAME}/_apis/pipelines/${process.env.AZURE_PIPELINE_ID}/runs?api-version=7.1`;

const PAYLOAD = {
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
        "command": "npx playwright test --grep @data-enrichment --project chromium"
    }
};


export async function triggerAzurePipeline() {
    console.log("Triggering Azure Pipeline");
    try {
        const response = await axios.post(ENDPOINT, PAYLOAD, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${Buffer.from(`:${process.env.AZURE_PERSONAL_ACCESS_TOKEN}`).toString('base64')}`,
            },
        });
        console.log("Azure Pipeline Triggered Successfully");
        console.log(response.data);
    } catch (error) {
        console.error("Error Triggering Azure Pipeline");
        console.error(error);
    }
}