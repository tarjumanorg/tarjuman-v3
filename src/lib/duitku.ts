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

import { getSecret } from 'astro:env/server';
import { createHash } from 'node:crypto';

// ─── Config ────────────────────────────────────────────────────
function getConfig() {
    const merchantCode = getSecret('DUITKU_MERCHANT_CODE');
    const apiKey = getSecret('DUITKU_API_KEY');
    const baseUrl = getSecret('DUITKU_BASE_URL') || 'https://sandbox.duitku.com';
    const siteUrl = getSecret('SITE_URL') || 'https://tarjuman.org';

    if (!merchantCode || !apiKey) {
        throw new Error('DUITKU_MERCHANT_CODE and DUITKU_API_KEY must be set. ' +
            `merchantCode: ${merchantCode ? 'SET' : 'MISSING'}, apiKey: ${apiKey ? 'SET' : 'MISSING'}`);
    }

    return { merchantCode, apiKey, baseUrl, siteUrl };
}

// ─── MD5 (via node:crypto — works in Node.js dev & Cloudflare Workers with nodejs_compat) ──
function md5(input: string): string {
    return createHash('md5').update(input).digest('hex');
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

    const responseText = await response.text();

    if (!response.ok) {
        throw new Error(`Duitku getPaymentMethods failed (${response.status}): ${responseText}`);
    }

    let data: DuitkuPaymentMethodResponse;
    try {
        data = JSON.parse(responseText) as DuitkuPaymentMethodResponse;
    } catch {
        throw new Error(`Duitku returned non-JSON: ${responseText}`);
    }

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

    const responseText = await response.text();

    if (!response.ok) {
        throw new Error(`Duitku requestTransaction failed (${response.status}): ${responseText}`);
    }

    const data = JSON.parse(responseText) as DuitkuTransactionResponse;
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
