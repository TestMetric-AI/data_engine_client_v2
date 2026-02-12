# Test Results API

Endpoint for recording Playwright test results from CI/CD pipelines.

## Authentication

Requires a valid API Token in the `Authorization` header (same as all other endpoints).

```http
Authorization: Bearer <YOUR_TOKEN>
```

See [API Documentation](./api_documentation.md#token-generation) for how to generate a token.

---

## POST `/api/test-results`

Save one or more test results.

- **Method**: `POST`
- **Content-Type**: `application/json`
- **Auth**: Bearer Token (JWT)

### Request Body

Accepts a **single object** or an **array of objects** with the following fields:

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `testTitle` | string | **Yes** | Test title (e.g. `"login page > should redirect"`) |
| `testStatus` | string | **Yes** | One of: `passed`, `failed`, `timedOut`, `skipped`, `interrupted` |
| `duration` | integer | **Yes** | Duration in milliseconds |
| `testFile` | string | **Yes** | Relative path to the test file (e.g. `"tests/login.spec.ts"`) |
| `testInfo` | object | **Yes** | Full Playwright `TestInfo` object as JSON |
| `testProject` | string | No | Playwright project name (e.g. `"chromium"`, `"firefox"`) |
| `retries` | integer | No | Max retries configured (default: `0`) |
| `retry` | integer | No | Current retry attempt (default: `0`) |
| `tags` | string[] | No | Test tags (default: `[]`) |
| `environment` | string | No | Execution environment (e.g. `"staging"`, `"production"`, `"dev"`) |
| `pipelineId` | string | No | CI/CD pipeline/run ID |
| `commitSha` | string | No | Git commit SHA (max 40 chars) |
| `branch` | string | No | Git branch name |
| `runUrl` | string | No | URL to the CI/CD run (must be a valid URL) |
| `provider` | string | No | CI provider name (e.g. `"github-actions"`, `"gitlab-ci"`) |

### Examples

#### Single result

```bash
curl -X POST "https://your-domain.com/api/test-results" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "testTitle": "login page > should redirect to dashboard",
    "testStatus": "passed",
    "duration": 1523,
    "testFile": "tests/login.spec.ts",
    "testProject": "chromium",
    "testInfo": {
      "title": "should redirect to dashboard",
      "expectedStatus": "passed",
      "annotations": [],
      "timeout": 30000
    },
    "branch": "main",
    "commitSha": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    "provider": "github-actions"
  }'
```

#### Batch (array)

```bash
curl -X POST "https://your-domain.com/api/test-results" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "testTitle": "login > success",
      "testStatus": "passed",
      "duration": 1200,
      "testFile": "tests/login.spec.ts",
      "testInfo": {},
      "branch": "feat/auth"
    },
    {
      "testTitle": "login > invalid password",
      "testStatus": "failed",
      "duration": 3500,
      "testFile": "tests/login.spec.ts",
      "testInfo": { "error": "Expected 200, got 401" },
      "branch": "feat/auth"
    }
  ]'
```

### Responses

#### 201 - Created

```json
{
  "message": "Test results saved",
  "count": 2
}
```

#### 400 - Validation Error

```json
{
  "message": "Validation error",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["testTitle"],
      "message": "Required"
    }
  ]
}
```

#### 401 - Unauthorized

```json
{
  "message": "Unauthorized"
}
```

---

## CI/CD Integration

### GitHub Actions

Example step to send results after Playwright runs:

```yaml
- name: Run Playwright tests
  run: npx playwright test --reporter=json > results.json

- name: Send results to Data Engine
  if: always()
  run: |
    jq '[.suites[].specs[].tests[] | {
      testTitle: .projectName + " > " + .title,
      testStatus: .status,
      duration: .duration,
      testFile: .location.file,
      testProject: .projectName,
      testInfo: .,
      pipelineId: "${{ github.run_id }}",
      commitSha: "${{ github.sha }}",
      branch: "${{ github.ref_name }}",
      runUrl: "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}",
      provider: "github-actions"
    }]' results.json | curl -X POST "${{ secrets.DATA_ENGINE_URL }}/api/test-results" \
      -H "Authorization: Bearer ${{ secrets.DATA_ENGINE_TOKEN }}" \
      -H "Content-Type: application/json" \
      -d @-
```

### Custom Playwright Reporter

You can also build a custom reporter that sends results directly:

```typescript
// reporters/data-engine-reporter.ts
import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";

class DataEngineReporter implements Reporter {
    private results: object[] = [];

    onTestEnd(test: TestCase, result: TestResult) {
        this.results.push({
            testTitle: test.titlePath().join(" > "),
            testStatus: result.status,
            duration: result.duration,
            testFile: test.location.file,
            testProject: test.parent.project()?.name,
            retries: test.retries,
            retry: result.retry,
            tags: test.tags,
            testInfo: result,
            pipelineId: process.env.CI_PIPELINE_ID,
            commitSha: process.env.CI_COMMIT_SHA,
            branch: process.env.CI_BRANCH,
            runUrl: process.env.CI_RUN_URL,
            provider: process.env.CI_PROVIDER,
        });
    }

    async onEnd() {
        if (this.results.length === 0) return;

        await fetch(`${process.env.DATA_ENGINE_URL}/api/test-results`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.DATA_ENGINE_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(this.results),
        });
    }
}

export default DataEngineReporter;
```

Then in `playwright.config.ts`:

```typescript
export default defineConfig({
    reporter: [["html"], ["./reporters/data-engine-reporter.ts"]],
});
```
