import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";
import { sendWelcomeEmail, sendStatusUpdateEmail } from "../../../lib/sendpulse";

// This endpoint receives webhooks from Supabase triggers
export const POST: APIRoute = async ({ request }) => {
    try {
        // 1. Validate Secret Header
        // In Supabase Webhooks, we can configure it to send a custom secret header
        const secretHeader = request.headers.get("x-supabase-webhook-secret");
        const expectedSecret = import.meta.env.WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;

        // Note: For initial development if WEBHOOK_SECRET is not set, we'll log a warning but proceed.
        if (expectedSecret && secretHeader !== expectedSecret) {
            console.error('[Webhook] Unauthorized: Invalid secret header');
            return new Response("Unauthorized", { status: 401 });
        }

        // 2. Parse Payload
        let payload;
        try {
            payload = await request.json();
            console.log('[Webhook] Raw payload:', JSON.stringify(payload));
        } catch (e) {
            console.error('[Webhook] Failed to parse JSON body', e);
            return new Response("Invalid JSON", { status: 400 });
        }

        const { type, table, record, old_record } = payload;

        console.log(`[Webhook] Received ${type} event on ${table}`);

        if (!SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[Webhook] SUPABASE_SERVICE_ROLE_KEY missing');
            return new Response("Server config error", { status: 500 });
        }

        const supabase = createClient(
            import.meta.env.PUBLIC_SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY
        );

        // 3. Route Event
        if (table === 'profiles' /* or 'users' depending on where signups land */ && type === 'INSERT') {
            // New user registration -> Welcome Email
            const email = record.email || record.user_email; // Adjust based on your schema
            const name = record.full_name || "Customer";
            if (email) {
                try {
                    await sendWelcomeEmail(email, name);
                    console.log(`[SendPulse] Welcome email sent to ${email}`);
                } catch (e) {
                    console.error('[SendPulse] Failed to send welcome email:', e);
                }
            }
        }
        else if (table === 'orders' && type === 'UPDATE') {
            // Order status changed
            const oldStatus = old_record?.status;
            const newStatus = record?.status;

            console.log(`[Webhook] Order update: ${oldStatus} -> ${newStatus}`);

            // Only send if the status actually changed, and ignore the initial "processing" change 
            // since that is covered by the Duitku Order Confirmation email.
            if (oldStatus !== newStatus && newStatus !== 'processing' && newStatus !== 'pending') {
                const email = record.user_email;
                let name = "Customer";

                if (record.user_id) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', record.user_id)
                        .single();
                    if (profile?.full_name) name = profile.full_name;
                }

                if (email) {
                    try {
                        await sendStatusUpdateEmail(email, name, { orderId: record.id }, newStatus);
                        console.log(`[SendPulse] Status update email (${newStatus}) sent to ${email}`);
                    } catch (e) {
                        console.error('[SendPulse] Failed to send status update email:', e);
                    }
                } else {
                    console.log(`[SendPulse] No user_email found for order ${record.id}`);
                }
            } else {
                console.log(`[Webhook] Status unchanged or ignored (${newStatus}). Skipping email.`);
            }
        }

        return new Response("Webhook processed", { status: 200 });

    } catch (error) {
        console.error('[Webhook] Processing error:', error);
        // Return 200 so Supabase doesn't infinitely retry on logic errors
        return new Response("Error processed", { status: 200 });
    }
};
