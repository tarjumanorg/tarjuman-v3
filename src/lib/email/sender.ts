import { SENDER_API_KEY } from "astro:env/server";

export type EmailPayload = {
    to: string;
    toName?: string | null;
    subject: string;
    html: string;
    text: string;
};

const SENDER_ENDPOINT = "https://api.sender.net/v2/message/send";
const FROM = { email: "admin@tarjuman.org", name: "Tarjuman" };

type SenderResponse = { success?: boolean; message?: string; errors?: unknown };

/**
 * Sends one transactional email through Sender's REST API.
 * Throws on a missing key, a non-2xx status, or `success: false`.
 */
export async function sendEmail({ to, toName, subject, html, text }: EmailPayload): Promise<void> {
    if (!SENDER_API_KEY) {
        throw new Error("SENDER_API_KEY is not configured");
    }

    const res = await fetch(SENDER_ENDPOINT, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${SENDER_API_KEY}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            from: FROM,
            to: { email: to, name: toName ?? undefined },
            subject,
            html,
            text,
        }),
    });

    const body = (await res.json().catch(() => null)) as SenderResponse | null;
    if (!res.ok || body?.success === false) {
        const detail = body?.errors ? ` ${JSON.stringify(body.errors)}` : "";
        throw new Error(`Sender ${res.status}: ${body?.message ?? res.statusText}${detail}`);
    }
}
