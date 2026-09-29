const nodemailer = require('nodemailer');

const hasSmtpConfig = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const transporter = hasSmtpConfig ? nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
}) : null;

const appUrl = (process.env.PUBLIC_APP_URL || process.env.CORS_ORIGINS || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');

async function sendPasswordResetEmail({ to, name, token }) {
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    if (!transporter) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn(`[email] SMTP não configurado. Link local de recuperação: ${resetUrl}`);
            return { delivered: false, resetUrl };
        }
        throw new Error('SMTP não configurado');
    }

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: 'Redefina sua senha do Duoo',
        text: `Olá, ${name || 'tudo bem'}!\n\nUse este link para criar uma nova senha no Duoo: ${resetUrl}\n\nO link expira em 30 minutos. Se você não solicitou isso, ignore este e-mail.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0f172a"><h1 style="color:#059669">Redefinir senha</h1><p>Olá, ${name || 'tudo bem'}!</p><p>Recebemos uma solicitação para criar uma nova senha no Duoo.</p><p><a href="${resetUrl}" style="display:inline-block;background:#059669;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Criar nova senha</a></p><p style="color:#64748b;font-size:13px">O link expira em 30 minutos. Se você não solicitou isso, ignore este e-mail.</p></div>`
    });
    return { delivered: true };
}

module.exports = { sendPasswordResetEmail };
