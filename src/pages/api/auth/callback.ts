import type { APIRoute } from "astro";
import { createClient } from "../../../lib/supabase";

export const GET: APIRoute = async (context) => {
    const { searchParams } = new URL(context.request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") || "/dashboard";

    if (!code) {
        return new Response("No code provided", { status: 400 });
    }

    const supabase = createClient(context);
    const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    // Check if this is a first-time login (within 60 seconds of profile creation)
    if (authData?.session?.user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("created_at")
            .eq("id", authData.session.user.id)
            .single();

        if (profile?.created_at) {
            const createdAtTime = new Date(profile.created_at).getTime();
            const now = Date.now();

            // If the profile was created less than 60 seconds ago, it's a new signup
            if (now - createdAtTime < 60000) {
                // Determine user's name from metadata, fallback to empty string or email prefix
                const userName = authData.session.user.user_metadata?.full_name
                    || authData.session.user.email?.split("@")[0]
                    || "User";
                const userEmail = authData.session.user.email;

                if (userEmail) {
                    try {
                        const { sendEmail } = await import("../../../lib/sendpulse");
                        await sendEmail({
                            to: userEmail,
                            toName: userName,
                            subject: "Welcome to Tarjuman!",
                            html: `
                                <h1>Welcome to Tarjuman!</h1>
                                <p>Hi ${userName},</p>
                                <p>Thank you for signing up to Tarjuman. We are excited to help you with your translation needs.</p>
                                <p>You can start by requesting a quotation or uploading your documents on your dashboard.</p>
                                <br/>
                                <p>Best regards,<br/>The Tarjuman Team</p>
                            `
                        });
                    } catch (e) {
                        console.error("[Email] Failed to send welcome email:", e);
                    }
                }
            }
        }
    }

    return context.redirect(next);
};
