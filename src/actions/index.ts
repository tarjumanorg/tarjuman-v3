import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { createClient } from '../lib/supabase';
import { sendOrderEmailById } from '../lib/email';
import { SUPABASE_SERVICE_ROLE_KEY } from 'astro:env/server';

export const server = {
    // Confirm Payment (Admin Action)
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

            // Only flip orders that are not already paid, so a Mayar-settled order
            // is not reset to 'processing' and the customer is not emailed twice.
            const { data: updatedOrder, error: updateError } = await adminSupabase
                .from("orders")
                .update({
                    payment_status: 'paid',
                    status: 'processing',
                    updated_at: new Date().toISOString(),
                })
                .eq("id", orderId)
                .or('payment_status.is.null,payment_status.neq.paid')
                .select('id')
                .maybeSingle();

            if (updateError) throw new Error("Failed to update order status");

            if (updatedOrder) {
                await sendOrderEmailById(adminSupabase, 'paymentReceived', orderId);
            }

            return { success: true };
        }
    })
};
