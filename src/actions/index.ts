import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { createClient } from '../lib/supabase';
import { sendEmail } from '../lib/sendpulse';
import { SUPABASE_SERVICE_ROLE_KEY } from 'astro:env/server';

export const server = {
    // 1. Submit Transfer Proof
    submitTransferProof: defineAction({
        accept: 'form',
        input: z.object({
            orderId: z.string().uuid(),
            proof: z.instanceof(File),
        }),
        handler: async ({ orderId, proof }, context) => {
            const supabase = createClient(context as any);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Unauthorized");

            const { data: order, error: orderError } = await supabase
                .from("orders")
                .select("*")
                .eq("id", orderId)
                .single();

            if (orderError || !order) throw new Error("Order not found");
            if (order.user_id !== user.id) throw new Error("Unauthorized");
            if (order.payment_status === 'paid') throw new Error("Order is already paid");

            // Max size 5MB validation
            if (proof.size > 5 * 1024 * 1024) {
                throw new Error("File size exceeds 5MB limit");
            }

            const fileExt = proof.name.split('.').pop() || 'png';
            const fileName = `transfer_proof_${Date.now()}.${fileExt}`;
            const filePath = `${orderId}/${fileName}`;

            // Use admin client to bypass RLS for storage uploads
            if (!SUPABASE_SERVICE_ROLE_KEY) {
                throw new Error("Server configuration error: SUPABASE_SERVICE_ROLE_KEY missing");
            }
            const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
            const adminSupabase = createSupabaseClient(
                import.meta.env.PUBLIC_SUPABASE_URL,
                SUPABASE_SERVICE_ROLE_KEY
            );

            const { error: uploadError } = await adminSupabase.storage
                .from('order-files')
                .upload(filePath, proof);

            if (uploadError) throw new Error("Failed to upload proof: " + uploadError.message);

            const { error: updateError } = await adminSupabase
                .from("orders")
                .update({
                    transfer_proof_url: filePath,
                    payment_method: 'bank_transfer',
                    payment_status: 'pending'
                })
                .eq("id", orderId);

            if (updateError) throw new Error("Failed to update order");

            return { success: true };
        }
    }),

    // 2. Confirm Payment (Admin Action)
    confirmPayment: defineAction({
        accept: 'form',
        input: z.object({
            orderId: z.string().uuid(),
        }),
        handler: async ({ orderId }, context) => {
            const supabase = createClient(context as any);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Unauthorized");

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
                
            if (profile?.role !== 'admin') throw new Error("Unauthorized - Admin only");
            
            if (!SUPABASE_SERVICE_ROLE_KEY) {
                throw new Error("Server configuration error: SUPABASE_SERVICE_ROLE_KEY missing");
            }

            // Requires @supabase/supabase-js to bypass context RLS with service role for updates
            const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
            const adminSupabase = createSupabaseClient(
                import.meta.env.PUBLIC_SUPABASE_URL,
                SUPABASE_SERVICE_ROLE_KEY
            );

            const { data: updatedOrder, error: updateError } = await adminSupabase
                .from("orders")
                .update({
                    payment_status: 'paid',
                    status: 'processing',
                    updated_at: new Date().toISOString(),
                })
                .eq("id", orderId)
                .select(`
                    id, 
                    profiles (
                        email,
                        full_name
                    )
                `)
                .single();

            if (updateError) throw new Error("Failed to update order status");

            try {
                const profiles = updatedOrder?.profiles;
                const userEmail = (profiles as any)?.email;
                const userName = (profiles as any)?.full_name || "User";

                if (userEmail) {
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

            return { success: true };
        }
    })
};
