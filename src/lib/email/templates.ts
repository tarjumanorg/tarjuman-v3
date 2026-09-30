export type EmailKind = "welcome" | "paymentReceived" | "draftReady" | "orderComplete";

export type TemplateData = {
    name?: string | null;
    orderRef: string;
    url: string;
};

export type EmailContent = { subject: string; html: string; text: string };

// Mirrors the light-theme tokens in src/styles/global.css (--primary, --accent).
// Email clients need literal inline values; they cannot read CSS variables.
const PRIMARY = "#064E3B";
const ACCENT = "#E1CA96";

const HTML_ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

type Layout = {
    subject: string;
    heading: string;
    paragraphs: string[];
    cta: { label: string; url: string };
};

const SIGN_OFF = ["Salam hormat,", "Tim Tarjuman"];

function layout({ subject, heading, paragraphs, cta }: Layout): EmailContent {
    const body = paragraphs
        .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937;">${escapeHtml(p)}</p>`)
        .join("");

    const html = `<!doctype html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:24px 16px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
<div style="background:${PRIMARY};padding:20px 24px;color:#ffffff;font-size:20px;font-weight:bold;">Tarjuman</div>
<div style="padding:24px;">
<h1 style="margin:0 0 16px;font-size:22px;color:${PRIMARY};">${escapeHtml(heading)}</h1>
${body}
<p style="margin:24px 0;"><a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:12px 24px;background:${PRIMARY};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;border-bottom:3px solid ${ACCENT};">${escapeHtml(cta.label)}</a></p>
<p style="margin:0;font-size:16px;line-height:1.6;color:#1f2937;">${SIGN_OFF[0]}<br>${SIGN_OFF[1]}</p>
</div>
<div style="padding:16px 24px;background:#fafafa;font-size:12px;color:#6b7280;">Email ini dikirim otomatis oleh Tarjuman (tarjuman.org).</div>
</div>
</body>
</html>`;

    const text = [heading, "", ...paragraphs.flatMap((p) => [p, ""]), `${cta.label}: ${cta.url}`, "", ...SIGN_OFF].join("\n");

    return { subject, html, text };
}

const greeting = (name?: string | null) => `Halo ${name?.trim() || "Pelanggan"},`;

export const templates: Record<EmailKind, (data: TemplateData) => EmailContent> = {
    welcome: ({ name, url }) =>
        layout({
            subject: "Selamat datang di Tarjuman",
            heading: "Selamat datang di Tarjuman",
            paragraphs: [
                greeting(name),
                "Terima kasih telah mendaftar di Tarjuman. Anda dapat mulai dengan meminta penawaran atau mengunggah dokumen melalui dasbor Anda.",
            ],
            cta: { label: "Buka Dasbor", url },
        }),
    paymentReceived: ({ name, orderRef, url }) =>
        layout({
            subject: "Pembayaran diterima, pesanan Anda sedang diproses",
            heading: "Pembayaran diterima",
            paragraphs: [
                greeting(name),
                `Terima kasih, pembayaran Anda untuk pesanan ${orderRef} telah kami terima dan pesanan sedang diproses.`,
                "Kami akan mengabari Anda begitu draf terjemahan siap ditinjau.",
            ],
            cta: { label: "Lihat Pesanan", url },
        }),
    draftReady: ({ name, orderRef, url }) =>
        layout({
            subject: "Draf terjemahan Anda siap ditinjau",
            heading: "Draf siap ditinjau",
            paragraphs: [
                greeting(name),
                `Draf terjemahan untuk pesanan ${orderRef} sudah siap.`,
                "Silakan tinjau di dasbor, lalu setujui atau ajukan revisi.",
            ],
            cta: { label: "Tinjau Draf", url },
        }),
    orderComplete: ({ name, orderRef, url }) =>
        layout({
            subject: "Pesanan terjemahan Anda telah selesai",
            heading: "Pesanan selesai",
            paragraphs: [
                greeting(name),
                `Berkas final untuk pesanan ${orderRef} sudah tersedia.`,
                "Silakan unduh dokumen terjemahan Anda dari dasbor.",
            ],
            cta: { label: "Unduh Dokumen", url },
        }),
};
