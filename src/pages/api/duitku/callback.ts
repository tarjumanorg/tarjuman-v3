/**
 * Duitku Callback Endpoint
 * 
 * Called by Duitku's server (not the user's browser) when payment status changes.
 * Content-Type: x-www-form-urlencoded
 * Must return HTTP 200 OK.
 * 
 * No auth required — validated via signature.
 */
import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";
import { verifyCallbackSignature, type DuitkuCallbackParams } from "../../../lib/duitku";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        // 1. Parse x-www-form-urlencoded body
        const formData = await request.formData();
        const params: DuitkuCallbackParams = {
            merchantCode: formData.get('merchantCode') as string || '',
            amount: formData.get('amount') as string || '',
            merchantOrderId: formData.get('merchantOrderId') as string || '',
            productDetail: formData.get('productDetail') as string || '',
            additionalParam: formData.get('additionalParam') as string || '',
            paymentCode: formData.get('paymentCode') as string || '',
            resultCode: formData.get('resultCode') as string || '',
            merchantUserId: formData.get('merchantUserId') as string || '',
            reference: formData.get('reference') as string || '',
            signature: formData.get('signature') as string || '',
            publisherOrderId: formData.get('publisherOrderId') as string || '',
            spUserHash: formData.get('spUserHash') as string || '',
            settlementDate: formData.get('settlementDate') as string || '',
            issuerCode: formData.get('issuerCode') as string || '',
        };

        console.log('[Duitku Callback] Received:', {
            merchantOrderId: params.merchantOrderId,
            resultCode: params.resultCode,
            reference: params.reference,
            amount: params.amount,
        });

        // 2. Validate required fields
        if (!params.merchantCode || !params.amount || !params.merchantOrderId || !params.signature) {
            console.error('[Duitku Callback] Missing required parameters');
            return new Response('Bad Parameter', { status: 400 });
        }

        // 3. Verify signature
        if (!verifyCallbackSignature(params)) {
            console.error('[Duitku Callback] Invalid signature');
            return new Response('Bad Signature', { status: 400 });
        }

        // 4. Use service-role (secret key) client for admin updates (bypass RLS)
        // The callback is a server-to-server call with no user session, so we need admin access.
        if (!SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[Duitku Callback] SUPABASE_SERVICE_ROLE_KEY is not configured');
            return new Response('Server Configuration Error', { status: 500 });
        }
        const supabase = createClient(
            import.meta.env.PUBLIC_SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
        );

        // 5. Process based on resultCode
        // resultCode "00" = Success, "01" = Pending, "02" = Canceled/Failed
        if (params.resultCode === '00') {
            // Payment successful
            const { data: updatedOrder, error: updateError } = await supabase
                .from('orders')
                .update({
                    payment_status: 'paid',
                    status: 'processing',
                    duitku_reference: params.reference,
                })
                .eq('id', params.merchantOrderId)
                .select(`
                    id, 
                    user_id,
                    profiles (
                        email,
                        full_name
                    )
                `)
                .single();

            if (updateError) {
                console.error('[Duitku Callback] Failed to update order:', updateError);
                // Still return 200 to Duitku — we can retry manually
            } else {
                console.log('[Duitku Callback] Order updated to paid:', params.merchantOrderId);

                // Send 'Processing' email
                try {
                    const profiles = updatedOrder?.profiles;
                    // Supabase returns related profile as either generic or array depending on relation, usually an object on many-to-one
                    const userEmail = (profiles as any)?.email;
                    const userName = (profiles as any)?.full_name || "User";

                    if (userEmail) {
                        const { sendEmail } = await import("../../../lib/sendpulse");
                        await sendEmail({
                            to: userEmail,
                            toName: userName,
                            subject: "We're processing your order!",
                            html: `
                                <h2>Payment Received</h2>
                                <p>Hi ${userName},</p>
                                <p>Thank you for your payment!</p>
                                <p>Your order for translation services (Order ID: <b>${updatedOrder.id}</b>) is now being processed.</p>
                                <p>We will notify you once your draft is ready for review.</p>
                                <br/>
                                <p>Best regards,<br/>The Tarjuman Team</p>
                            `
                        });
                    }
                } catch (e) {
                    console.error("[Email] Failed to send processing email:", e);
                }
            }
        } else {
            console.log('[Duitku Callback] Non-success resultCode:', params.resultCode, 'for order:', params.merchantOrderId);
        }

        // Must return 200 OK to Duitku
        return new Response('OK', { status: 200 });
    } catch (err) {
        console.error('[Duitku Callback] Error:', err);
        // Still return 200 to prevent Duitku from retrying endlessly
        return new Response('OK', { status: 200 });
    }
};
