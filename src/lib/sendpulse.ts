import sendpulse from "sendpulse-api";
import { SENDPULSE_ID, SENDPULSE_SECRET } from "astro:env/server";

let _initialized = false;

/**
 * Initializes the SendPulse REST client if not already initialized.
 * Rejects if credentials are not configured.
 */
async function ensureInit(): Promise<void> {
    if (_initialized) return;

    if (!SENDPULSE_ID || !SENDPULSE_SECRET) {
        throw new Error("SENDPULSE credentials are not configured in environment variables.");
    }

    return new Promise((resolve, reject) => {
        // SendPulse uses a file cache for the token. /tmp is usually suitable on serverless/Node.
        sendpulse.init(SENDPULSE_ID, SENDPULSE_SECRET, "/tmp/", (token: any) => {
            if (token && token.is_error) {
                reject(new Error(`SendPulse init error: ${token.message}`));
            } else {
                _initialized = true;
                resolve();
            }
        });
    });
}

export type EmailPayload = {
    to: string;
    toName?: string;
    subject: string;
    html: string;
    text?: string;
};

/**
 * Sends a transactional email using the SendPulse REST API.
 * 
 * @param payload Object containing email fields.
 * @returns Boolean indicating success (or throws).
 */
export async function sendEmail({ to, toName, subject, html, text }: EmailPayload): Promise<boolean> {
    await ensureInit();

    const emailDetails = {
        html: html,
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

    return new Promise((resolve, reject) => {
        sendpulse.smtpSendMail((response: any) => {
            if (response && response.is_error) {
                console.error("[SendPulse] Failed to send email:", response);
                reject(new Error(`Failed to send email: ${response.message}`));
            } else {
                console.log(`[SendPulse] Email sent successfully to ${to}`);
                resolve(true);
            }
        }, emailDetails);
    });
}
