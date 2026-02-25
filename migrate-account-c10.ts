import * as fs from 'fs';
import * as path from 'path';

const dotenv = require('dotenv');

// Load .env.local if it exists, otherwise fallback to .env
if (fs.existsSync(path.resolve('.env.local'))) {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config();
}


import { ensureAccountC10Table } from './src/lib/services/account-c10';

async function main() {
    console.log("Checking Turso Database creation logic for AccountC10...");
    await ensureAccountC10Table();
    console.log("Table successfully checked and created (if missing).");
    process.exit(0);
}

main().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});

