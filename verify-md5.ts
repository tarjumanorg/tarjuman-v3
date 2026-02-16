
import { md5 } from './src/lib/md5';

const testString = "DuitkuPaymentGateway";
const expectedHash = "e9591e6b91170940428470B0971593F6".toLowerCase(); // md5("DuitkuPaymentGateway")

const actualHash = md5(testString);

console.log(`Test String: "${testString}"`);
console.log(`Expected: ${expectedHash}`);
console.log(`Actual:   ${actualHash}`);

if (actualHash === expectedHash) {
    console.log("✅ MD5 Verification PASSED");
} else {
    console.error("❌ MD5 Verification FAILED");
}
