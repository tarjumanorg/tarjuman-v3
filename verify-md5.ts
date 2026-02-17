
import { md5 } from './src/lib/md5';

import { md5 } from './src/lib/md5';

const merchantCode = "DS27981";
const apiKey = "9e3168b8ca459d0c3476e918e58ce48d";
const merchantOrderId = "ea2f0c42-8b8a-4b9e-b2c7-2e3ef094b739";
const amount = "75000"; // Confirmed from DB

// MD5(merchantCode + amount + merchantOrderId + apiKey)
const signatureInput = merchantCode + amount + merchantOrderId + apiKey;
const signature = md5(signatureInput);

console.log(`Signature Input: "${signatureInput}"`);
console.log(`Generated Signature: ${signature}`);
console.log(`\nCURL Command:`);
console.log(`curl -X POST https://tarjuman.org/api/duitku/callback -d "merchantCode=${merchantCode}&amount=${amount}&merchantOrderId=${merchantOrderId}&signature=${signature}&resultCode=00&reference=MANUAL_TEST"`);

