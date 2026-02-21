import type { APIRoute } from "astro";
import { sendEmail } from "../../../lib/sendpulse";

export const prerender = false;

export const GET: APIRoute = async (context) => {
    const { searchParams } = new URL(context.request.url);
    const to = searchParams.get("to") || "admin@tarjuman.org";

    try {
        await sendEmail({
            to: to,
            toName: "Test Run",
            subject: "Tarjuman Edge Diagnostics",
            html: `<p>This is a diagnostic email bypassing the Duitku callback.</p>`
        });

        return new Response(JSON.stringify({ success: true, message: `Dispatched to ${to}` }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({
            success: false,
            error: e.message || "Unknown error",
            stack: e.stack
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
