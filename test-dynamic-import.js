// No dotenv
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function check() {
    console.log("Testing dynamic import");
    try {
        // Simulating the exact dynamic import from callback.ts
        // In callback.ts it's: const { sendEmail } = await import("../../../lib/sendpulse");
        // Because of the build process in Astro/Cloudflare, dynamic imports inside the endpoint
        // can sometimes resolve incorrectly if not bundled properly.

        console.log("If Astro build fails to bundle this dynamic import, the email quietly fails in the try-catch block.");
    } catch (e) {
        console.error(e);
    }
}

check();
