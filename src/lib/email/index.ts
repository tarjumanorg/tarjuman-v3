import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE_URL } from "astro:env/server";
import { sendEmail } from "./sender";
import { templates, type EmailKind } from "./templates";

type Recipient = { to: string; name?: string | null; orderId?: string };

/**
 * Builds and sends one email. Never throws: an email problem must not fail
 * the order flow that triggered it, so errors are logged and swallowed.
 */
export async function sendOrderEmail(kind: EmailKind, { to, name, orderId }: Recipient): Promise<void> {
    try {
        const orderRef = orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : "";
        const url = `${SITE_URL}${orderId ? `/orders/${orderId}` : "/dashboard"}`;
        await sendEmail({ to, toName: name, ...templates[kind]({ name, orderRef, url }) });
    } catch (e) {
        console.error(`[Email] ${kind} failed`, { orderId }, e);
    }
}

type OrderProfile = { email: string | null; full_name: string | null } | null;

/**
 * Looks up the order's customer and sends the given order email.
 * `supabase` must be able to read `orders` and `profiles` (use the service-role client).
 */
export async function sendOrderEmailById(
    supabase: SupabaseClient,
    kind: Exclude<EmailKind, "welcome">,
    orderId: string,
): Promise<void> {
    const { data, error } = await supabase
        .from("orders")
        .select("id, profiles(email, full_name)")
        .eq("id", orderId)
        .maybeSingle();

    const profile = (data?.profiles ?? null) as unknown as OrderProfile;
    if (error || !profile?.email) {
        console.error(`[Email] ${kind} skipped: no recipient`, { orderId }, error);
        return;
    }
    await sendOrderEmail(kind, { to: profile.email, name: profile.full_name, orderId });
}
