import { SENDPULSE_API_ID, SENDPULSE_API_SECRET, SENDPULSE_ID, SENDPULSE_SECRET } from "astro:env/server";

export type EmailPayload = {
    to: string;
    toName?: string;
    subject: string;
    html: string;
    text?: string;
};

// We cache the token in memory for the duration of this Edge worker's lifecycle
let _token: string | null = null;
let _tokenExpiry: number = 0;

/**
 * Initializes the SendPulse token if not valid.
 */
async function ensureInit(): Promise<void> {
    const id = SENDPULSE_API_ID || SENDPULSE_ID;
    const secret = SENDPULSE_API_SECRET || SENDPULSE_SECRET;

    if (_token && Date.now() < _tokenExpiry) {
        return;
    }

    if (!id || !secret) {
        throw new Error("SENDPULSE credentials are not configured in environment variables.");
    }

    const res = await fetch('https://api.sendpulse.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: id,
            client_secret: secret
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`SendPulse init error: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    if (!data.access_token) {
        throw new Error("SendPulse init error: No access token returned");
    }

    _token = data.access_token;
    // expires_in is in seconds, we subtract 60s as a safety margin
    _tokenExpiry = Date.now() + ((data.expires_in - 60) * 1000);
}

/**
 * Sends a transactional email using the SendPulse REST API via fetch.
 * 
 * @param payload Object containing email fields.
 * @returns Boolean indicating success.
 */
export async function sendEmail({ to, toName, subject, html, text }: EmailPayload): Promise<boolean> {
    await ensureInit();

    // SendPulse SMTP API requires base64 encoded HTML
    // We use a modern, universally supported Web API method because `Buffer` is not available on Cloudflare Pages
    const bytes = new TextEncoder().encode(html);
    let binString = '';
    // A loop prevents 'Maximum call stack size exceeded' errors when dealing with large HTML strings
    for (let i = 0; i < bytes.byteLength; i++) {
        binString += String.fromCodePoint(bytes[i]);
    }
    const htmlBase64 = btoa(binString);

    const emailDetails = {
        html: htmlBase64,
        text: text || "Please view this email in an HTML compatible client.",
        subject: subject,
        from: {
            name: "Tarjuman",
            email: "admin@tarjuman.org"
        },
        to: [
            {
                name: toName || "Valued User",
                email: to
            }
        ]
    };

    const res = await fetch("https://api.sendpulse.com/smtp/emails", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${_token}`
        },
        body: JSON.stringify({ email: emailDetails })
    });

    if (!res.ok) {
        const body = await res.text();
        console.error("[SendPulse] Failed to send email:", res.status, body);
        throw new Error(`Failed to send email: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.is_error || data.result === false) {
        console.error("[SendPulse] Failed to send email response:", data);
        throw new Error(`Failed to send email: ${data.message || 'Unknown error'}`);
    }

    console.log(`[SendPulse] Email sent successfully to ${to}`);
    return true;
}
