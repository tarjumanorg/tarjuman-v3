/**
 * Duitku Payment Gateway Integration Helper
 * 
 * Sandbox docs: https://docs.duitku.com/api/en/
 * 
 * Key API flows:
 * 1. Get Payment Methods: SHA256(merchantCode + amount + datetime + apiKey)
 * 2. Request Transaction: MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
 * 3. Callback Verification: MD5(merchantCode + amount + merchantOrderId + apiKey)
 */

// ─── Config ────────────────────────────────────────────────────
function getConfig() {
    const merchantCode = import.meta.env.DUITKU_MERCHANT_CODE;
    const apiKey = import.meta.env.DUITKU_API_KEY;
    const baseUrl = import.meta.env.DUITKU_BASE_URL || 'https://sandbox.duitku.com';
    const siteUrl = import.meta.env.SITE_URL || 'https://tarjuman.org';

    if (!merchantCode || !apiKey) {
        throw new Error('DUITKU_MERCHANT_CODE and DUITKU_API_KEY must be set');
    }

    return { merchantCode, apiKey, baseUrl, siteUrl };
}

// ─── MD5 (Pure JS for Cloudflare Workers — Web Crypto doesn't support MD5) ──
// Minimal MD5 implementation based on RFC 1321
function md5(input: string): string {
    function safeAdd(x: number, y: number): number {
        const lsw = (x & 0xffff) + (y & 0xffff);
        const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xffff);
    }

    function bitRotateLeft(num: number, cnt: number): number {
        return (num << cnt) | (num >>> (32 - cnt));
    }

    function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
        return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
    }

    function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
        return md5cmn((b & c) | (~b & d), a, b, x, s, t);
    }

    function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
        return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
    }

    function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
        return md5cmn(b ^ c ^ d, a, b, x, s, t);
    }

    function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
        return md5cmn(c ^ (b | ~d), a, b, x, s, t);
    }

    function binlMD5(x: number[], len: number): number[] {
        x[len >> 5] |= 0x80 << len % 32;
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        let a = 1732584193;
        let b = -271733879;
        let c = -1732584194;
        let d = 271733878;

        for (let i = 0; i < x.length; i += 16) {
            const olda = a;
            const oldb = b;
            const oldc = c;
            const oldd = d;

            a = md5ff(a, b, c, d, x[i] || 0, 7, -680876936);
            d = md5ff(d, a, b, c, x[i + 1] || 0, 12, -389564586);
            c = md5ff(c, d, a, b, x[i + 2] || 0, 17, 606105819);
            b = md5ff(b, c, d, a, x[i + 3] || 0, 22, -1044525330);
            a = md5ff(a, b, c, d, x[i + 4] || 0, 7, -176418897);
            d = md5ff(d, a, b, c, x[i + 5] || 0, 12, 1200080426);
            c = md5ff(c, d, a, b, x[i + 6] || 0, 17, -1473231341);
            b = md5ff(b, c, d, a, x[i + 7] || 0, 22, -45705983);
            a = md5ff(a, b, c, d, x[i + 8] || 0, 7, 1770035416);
            d = md5ff(d, a, b, c, x[i + 9] || 0, 12, -1958414417);
            c = md5ff(c, d, a, b, x[i + 10] || 0, 17, -42063);
            b = md5ff(b, c, d, a, x[i + 11] || 0, 22, -1990404162);
            a = md5ff(a, b, c, d, x[i + 12] || 0, 7, 1804603682);
            d = md5ff(d, a, b, c, x[i + 13] || 0, 12, -40341101);
            c = md5ff(c, d, a, b, x[i + 14] || 0, 17, -1502002290);
            b = md5ff(b, c, d, a, x[i + 15] || 0, 22, 1236535329);

            a = md5gg(a, b, c, d, x[i + 1] || 0, 5, -165796510);
            d = md5gg(d, a, b, c, x[i + 6] || 0, 9, -1069501632);
            c = md5gg(c, d, a, b, x[i + 11] || 0, 14, 643717713);
            b = md5gg(b, c, d, a, x[i] || 0, 20, -373897302);
            a = md5gg(a, b, c, d, x[i + 5] || 0, 5, -701558691);
            d = md5gg(d, a, b, c, x[i + 10] || 0, 9, 38016083);
            c = md5gg(c, d, a, b, x[i + 15] || 0, 14, -660478335);
            b = md5gg(b, c, d, a, x[i + 4] || 0, 20, -405537848);
            a = md5gg(a, b, c, d, x[i + 9] || 0, 5, 568446438);
            d = md5gg(d, a, b, c, x[i + 14] || 0, 9, -1019803690);
            c = md5gg(c, d, a, b, x[i + 3] || 0, 14, -187363961);
            b = md5gg(b, c, d, a, x[i + 8] || 0, 20, 1163531501);
            a = md5gg(a, b, c, d, x[i + 13] || 0, 5, -1444681467);
            d = md5gg(d, a, b, c, x[i + 2] || 0, 9, -51403784);
            c = md5gg(c, d, a, b, x[i + 7] || 0, 14, 1735328473);
            b = md5gg(b, c, d, a, x[i + 12] || 0, 20, -1926607734);

            a = md5hh(a, b, c, d, x[i + 5] || 0, 4, -378558);
            d = md5hh(d, a, b, c, x[i + 8] || 0, 11, -2022574463);
            c = md5hh(c, d, a, b, x[i + 11] || 0, 16, 1839030562);
            b = md5hh(b, c, d, a, x[i + 14] || 0, 23, -35309556);
            a = md5hh(a, b, c, d, x[i + 1] || 0, 4, -1530992060);
            d = md5hh(d, a, b, c, x[i + 4] || 0, 11, 1272893353);
            c = md5hh(c, d, a, b, x[i + 7] || 0, 16, -155497632);
            b = md5hh(b, c, d, a, x[i + 10] || 0, 23, -1094730640);
            a = md5hh(a, b, c, d, x[i + 13] || 0, 4, 681279174);
            d = md5hh(d, a, b, c, x[i] || 0, 11, -358537222);
            c = md5hh(c, d, a, b, x[i + 3] || 0, 16, -722521979);
            b = md5hh(b, c, d, a, x[i + 6] || 0, 23, 76029189);
            a = md5hh(a, b, c, d, x[i + 9] || 0, 4, -640364487);
            d = md5hh(d, a, b, c, x[i + 12] || 0, 11, -421815835);
            c = md5hh(c, d, a, b, x[i + 15] || 0, 16, 530742520);
            b = md5hh(b, c, d, a, x[i + 2] || 0, 23, -995338651);

            a = md5ii(a, b, c, d, x[i] || 0, 6, -198630844);
            d = md5ii(d, a, b, c, x[i + 7] || 0, 10, 1126891415);
            c = md5ii(c, d, a, b, x[i + 14] || 0, 15, -1416354905);
            b = md5ii(b, c, d, a, x[i + 5] || 0, 21, -57434055);
            a = md5ii(a, b, c, d, x[i + 12] || 0, 6, 1700485571);
            d = md5ii(d, a, b, c, x[i + 3] || 0, 10, -1894986606);
            c = md5ii(c, d, a, b, x[i + 10] || 0, 15, -1051523);
            b = md5ii(b, c, d, a, x[i + 1] || 0, 21, -2054922799);
            a = md5ii(a, b, c, d, x[i + 8] || 0, 6, 1873313359);
            d = md5ii(d, a, b, c, x[i + 15] || 0, 10, -30611744);
            c = md5ii(c, d, a, b, x[i + 6] || 0, 15, -1560198380);
            b = md5ii(b, c, d, a, x[i + 13] || 0, 21, 1309151649);
            a = md5ii(a, b, c, d, x[i + 4] || 0, 6, -145523070);
            d = md5ii(d, a, b, c, x[i + 11] || 0, 10, -1120210379);
            c = md5ii(c, d, a, b, x[i + 2] || 0, 15, 718787259);
            b = md5ii(b, c, d, a, x[i + 9] || 0, 21, -343485551);

            a = safeAdd(a, olda);
            b = safeAdd(b, oldb);
            c = safeAdd(c, oldc);
            d = safeAdd(d, oldd);
        }
        return [a, b, c, d];
    }

    function binl2hex(binarray: number[]): string {
        const hexTab = '0123456789abcdef';
        let str = '';
        for (let i = 0; i < binarray.length * 32; i += 8) {
            str +=
                hexTab.charAt((binarray[i >> 5] >>> i % 32) & 0xf) +
                hexTab.charAt((binarray[i >> 5] >>> (i % 32 + 4)) & 0xf);
        }
        return str;
    }

    function str2binl(str: string): number[] {
        const bin: number[] = [];
        const mask = (1 << 8) - 1;
        for (let i = 0; i < str.length * 8; i += 8) {
            bin[i >> 5] |= (str.charCodeAt(i / 8) & mask) << i % 32;
        }
        return bin;
    }

    return binl2hex(binlMD5(str2binl(input), input.length * 8));
}

// ─── SHA256 (Web Crypto — available on Cloudflare Workers) ──────
async function sha256(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// ─── Types ─────────────────────────────────────────────────────
export interface DuitkuPaymentMethod {
    paymentMethod: string;
    paymentName: string;
    paymentImage: string;
    totalFee: string;
}

export interface DuitkuPaymentMethodResponse {
    paymentFee: DuitkuPaymentMethod[];
    responseCode: string;
    responseMessage: string;
}

export interface DuitkuTransactionRequest {
    orderId: string;
    paymentAmount: number;
    paymentMethod: string;
    productDetails: string;
    email: string;
    customerName: string;
    phoneNumber?: string;
}

export interface DuitkuTransactionResponse {
    merchantCode: string;
    reference: string;
    paymentUrl: string;
    vaNumber?: string;
    qrString?: string;
    amount: string;
    statusCode: string;
    statusMessage: string;
}

export interface DuitkuCallbackParams {
    merchantCode: string;
    amount: string;
    merchantOrderId: string;
    productDetail?: string;
    additionalParam?: string;
    paymentCode?: string;
    resultCode: string;
    merchantUserId?: string;
    reference: string;
    signature: string;
    publisherOrderId?: string;
    spUserHash?: string;
    settlementDate?: string;
    issuerCode?: string;
}

// ─── API Methods ───────────────────────────────────────────────

/**
 * Get available payment methods from Duitku for a given amount.
 */
export async function getPaymentMethods(amount: number): Promise<DuitkuPaymentMethod[]> {
    const { merchantCode, apiKey, baseUrl } = getConfig();
    const datetime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const signature = await sha256(merchantCode + amount + datetime + apiKey);

    const response = await fetch(
        `${baseUrl}/webapi/api/merchant/paymentmethod/getpaymentmethod`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                merchantcode: merchantCode,
                amount,
                datetime,
                signature,
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Duitku getPaymentMethods failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as DuitkuPaymentMethodResponse;
    if (data.responseCode !== '00') {
        throw new Error(`Duitku getPaymentMethods error: ${data.responseMessage}`);
    }

    return data.paymentFee || [];
}

/**
 * Request a payment transaction from Duitku.
 * Returns the payment URL to redirect the customer to.
 */
export async function requestTransaction(
    params: DuitkuTransactionRequest
): Promise<DuitkuTransactionResponse> {
    const { merchantCode, apiKey, baseUrl, siteUrl } = getConfig();

    const signature = md5(merchantCode + params.orderId + params.paymentAmount + apiKey);

    const nameParts = params.customerName.trim().split(' ');
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || '';

    const callbackUrl = `${siteUrl}/api/duitku/callback`;
    const returnUrl = `${siteUrl}/payment/success/${params.orderId}`;

    const body = {
        merchantCode,
        paymentAmount: params.paymentAmount,
        paymentMethod: params.paymentMethod,
        merchantOrderId: params.orderId,
        productDetails: params.productDetails,
        additionalParam: '',
        merchantUserInfo: '',
        customerVaName: params.customerName,
        email: params.email,
        phoneNumber: params.phoneNumber || '',
        itemDetails: [
            {
                name: params.productDetails,
                price: params.paymentAmount,
                quantity: 1,
            },
        ],
        customerDetail: {
            firstName,
            lastName,
            email: params.email,
            phoneNumber: params.phoneNumber || '',
        },
        callbackUrl,
        returnUrl,
        signature,
        expiryPeriod: 1440, // 24 hours
    };

    const response = await fetch(
        `${baseUrl}/webapi/api/merchant/v2/inquiry`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Duitku requestTransaction failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as DuitkuTransactionResponse;
    if (data.statusCode !== '00') {
        throw new Error(`Duitku transaction error: ${data.statusMessage}`);
    }

    return data;
}

/**
 * Verify Duitku callback signature.
 * Formula: MD5(merchantCode + amount + merchantOrderId + apiKey)
 */
export function verifyCallbackSignature(params: DuitkuCallbackParams): boolean {
    const { merchantCode, apiKey } = getConfig();
    const expected = md5(merchantCode + params.amount + params.merchantOrderId + apiKey);
    return expected === params.signature;
}
