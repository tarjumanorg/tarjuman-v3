import * as dotenv from 'dotenv';
import { sendWelcomeEmail, sendOrderConfirmationEmail, sendStatusUpdateEmail } from './src/lib/sendpulse';
import * as url from 'url';

// Load environment variables from .env
dotenv.config();

// Ensure process.env is mapped to expected vars if running outside Astro
if (!process.env.SENDPULSE_API_ID) {
    console.error("Missing SENDPULSE_API_ID in .env");
    process.exit(1);
}

const TEST_EMAIL = process.argv[2] || "fulan@example.com";
const TEST_NAME = "Test User";

async function runTests() {
    console.log(`Starting SendPulse integration tests for ${TEST_EMAIL}...`);

    try {
        console.log("1. Testing Welcome Email...");
        await sendWelcomeEmail(TEST_EMAIL, TEST_NAME);
        console.log("✅ Welcome Email sent successfully.\n");

        console.log("2. Testing Order Confirmation Email...");
        await sendOrderConfirmationEmail(TEST_EMAIL, TEST_NAME, { orderId: "ORD-TEST-12345" });
        console.log("✅ Order Confirmation Email sent successfully.\n");

        console.log("3. Testing Order Status Update Email...");
        await sendStatusUpdateEmail(TEST_EMAIL, TEST_NAME, { orderId: "ORD-TEST-12345" }, "completed");
        console.log("✅ Status Update Email sent successfully.\n");

        console.log("🎉 All tests passed!");
    } catch (e) {
        console.error("❌ Test failed:", e);
    }
}

// Since getSecret() from astro:env/server relies on Astro's build context,
// we need to slightly mock it or use process.env directly in sendpulse.ts for this isolated test.
// We'll run this via tsx to execute the TS file directly.
runTests();
