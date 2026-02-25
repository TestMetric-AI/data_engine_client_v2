import { parseAccountC10Csv } from "./src/lib/services/account-c10";

async function runEvaluationTest() {
    console.log("=== EVALUATION TEST START ===");

    const csvContentValid = `arrangement_id|account_id|currency|cleared_balance|company_code
arr-001|10001|USD|1500.50|COMP-A
arr-002|10002|EUR||COMP-B
arr-003|10003|USD|0|`;

    const csvContentInvalid = `arrangement_id|account_id|currency|cleared_balance|company_code
|10001|USD|1500.50|COMP-A
arr-002|NOT_A_NUMBER|EUR||COMP-B
arr-003|10003|USD|INVALID_BAL|`;

    console.log("-> Test 1: Valid CSV");
    const buffer1 = Buffer.from(csvContentValid, "utf-8");
    const result1 = parseAccountC10Csv(buffer1);
    console.log("Result 1 Valid Rows:", result1.rows.length);
    console.log("Result 1 Errors:", result1.errors);
    if (result1.errors.length === 0 && result1.rows.length === 3) {
        console.log("✓ Test 1 Passed.");
    } else {
        console.log("✗ Test 1 Failed.");
    }

    console.log("\n-> Test 2: Invalid CSV");
    const buffer2 = Buffer.from(csvContentInvalid, "utf-8");
    const result2 = parseAccountC10Csv(buffer2);
    console.log("Result 2 Valid Rows:", result2.rows.length);
    console.log("Result 2 Errors:", result2.errors);
    if (result2.errors.length === 3) {
        console.log("✓ Test 2 Passed.");
    } else {
        console.log("✗ Test 2 Failed.");
    }

    console.log("=== EVALUATION TEST END ===");
}

runEvaluationTest().catch(console.error);
