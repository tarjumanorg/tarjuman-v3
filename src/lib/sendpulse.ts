import sendpulse from 'sendpulse-api';
import { getSecret } from 'astro:env/server';

/**
 * Initializes the SendPulse API client.
 * Uses a promise to handle the initialization callback.
 */
function initSendPulse(): Promise<void> {
    return new Promise((resolve, reject) => {
        const apiId = getSecret('SENDPULSE_API_ID') || import.meta.env.SENDPULSE_API_ID || (process.env as any)?.SENDPULSE_API_ID;
        const apiSecret = getSecret('SENDPULSE_API_SECRET') || import.meta.env.SENDPULSE_API_SECRET || (process.env as any)?.SENDPULSE_API_SECRET;

        if (!apiId || !apiSecret) {
            console.error('[SendPulse] Missing credentials');
            return reject(new Error('SendPulse credentials missing'));
        }

        // SendPulse SDK initialization
        sendpulse.init(apiId, apiSecret, '/tmp/', (token: any) => {
            if (token && token.is_error) {
                console.error('[SendPulse] Init error:', token.message);
                return reject(new Error(token.message));
            }
            resolve();
        });
    });
}

/**
 * Sends a raw HTML email via SendPulse API.
 */
async function sendEmailRaw(subject: string, htmlHtml: string, toEmail: string, toName: string) {
    await initSendPulse();

    return new Promise((resolve, reject) => {
        const emailConfig = {
            html: htmlHtml,
            text: "Mohon buka email ini di aplikasi yang mendukung HTML.",
            subject: subject,
            from: {
                name: "Tarjuman System",
                email: "admin@tarjuman.org" // Must be verified in SendPulse
            },
            to: [
                {
                    name: toName || "Customer",
                    email: toEmail
                }
            ]
        };

        sendpulse.smtpSendMail((response: any) => {
            if (response && response.is_error) {
                console.error('[SendPulse] Error sending email:', response);
                return reject(new Error(response.message || 'Error sending email'));
            }
            resolve(response);
        }, emailConfig);
    });
}

export async function sendWelcomeEmail(email: string, name: string) {
    const html = `
    <div style="font-family: sans-serif; color: #333; line-height: 1.5; padding: 20px;">
        <h2>Selamat Datang di Tarjuman, ${name}!</h2>
        <p>Terima kasih telah bergabung dengan platform terjemahan kami. Kami siap membantu Anda menerjemahkan dokumen-dokumen penting Anda dengan cepat dan akurat.</p>
        <p>Anda dapat kapan saja memulai pesanan baru melalui dashboard Anda.</p>
        <br/>
        <p>Salam hangat,<br/>Tim Tarjuman</p>
    </div>
    `;
    return sendEmailRaw("Selamat Datang di Tarjuman!", html, email, name);
}

export async function sendOrderConfirmationEmail(email: string, name: string, orderDetails: any) {
    const html = `
    <div style="font-family: sans-serif; color: #333; line-height: 1.5; padding: 20px;">
        <h2>Pembayaran Berhasil!</h2>
        <p>Halo ${name},</p>
        <p>Kami telah menerima pembayaran Anda untuk pesanan <strong>${orderDetails.orderId || 'Terjemahan Dokumen'}</strong>.</p>
        <p>Tim kami akan segera memproses dokumen Anda sesuai dengan paket kecepatan yang Anda pilih.</p>
        <p>Anda dapat memantau status pesanan kapan saja melalui dashboard kami.</p>
        <br/>
        <p>Terima kasih atas kepercayaannya,<br/>Tim Tarjuman</p>
    </div>
    `;
    return sendEmailRaw("Pembayaran Pesanan Tarjuman Berhasil", html, email, name);
}

export async function sendStatusUpdateEmail(email: string, name: string, orderDetails: any, newStatus: string) {
    const html = `
    <div style="font-family: sans-serif; color: #333; line-height: 1.5; padding: 20px;">
        <h2>Status Pesanan Diperbarui</h2>
        <p>Halo ${name},</p>
        <p>Status pesanan Anda (<strong>${orderDetails.orderId || 'Pesanan'}</strong>) telah diperbarui menjadi: <strong style="color: #2563eb;">${newStatus.toUpperCase()}</strong>.</p>
        <p>Silakan masuk ke dashboard Tarjuman untuk melihat detail lebih lanjut atau mengunduh dokumen Anda jika sudah selesai.</p>
        <br/>
        <p>Terima kasih,<br/>Tim Tarjuman</p>
    </div>
    `;
    return sendEmailRaw(`Status Pesanan: ${newStatus}`, html, email, name);
}
