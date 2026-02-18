import nodemailer from 'nodemailer';

// Variáveis de ambiente padronizadas conforme solicitado
const smtpHost = process.env.MAIL_SERVER;
const smtpPort = process.env.MAIL_PORT
  ? parseInt(process.env.MAIL_PORT, 10)
  : 587;
const smtpUser = process.env.MAIL_USERNAME;
const smtpPass = process.env.MAIL_PASSWORD;
const fromEmail =
  process.env.MAIL_DEFAULT_SENDER || 'no-reply@fineixoapp.local';

if (!smtpHost || !smtpUser || !smtpPass) {
  // eslint-disable-next-line no-console
  console.warn(
    'SMTP não configurado. Defina MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD e MAIL_DEFAULT_SENDER para envio de emails.'
  );
}

const transporter =
  smtpHost && smtpUser && smtpPass
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
    : null;

export async function sendResetPasswordEmail(
  to: string,
  name: string,
  resetUrl: string
) {
  if (!transporter) {
    // eslint-disable-next-line no-console
    console.warn(
      'Tentativa de enviar email de reset de senha, mas SMTP não está configurado.'
    );
    return;
  }

  const subject = 'FineixoApp - Redefinição de senha';
  const text = `Olá, ${name}!

Recebemos uma solicitação para redefinir a senha da sua conta no FineixoApp.

Para criar uma nova senha, acesse o link abaixo:
${resetUrl}

Se você não fez esta solicitação, pode ignorar este email com segurança.

Este link é válido por 1 hora.

Equipe FineixoApp`;

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a; font-size:14px; line-height:1.6;">
      <p>Olá, <strong>${name}</strong>!</p>
      <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>FineixoApp</strong>.</p>
      <p>Para criar uma nova senha, clique no botão abaixo:</p>
      <p style="text-align:center; margin: 24px 0;">
        <a
          href="${resetUrl}"
          style="display:inline-block; background:#10b981; color:#0f172a; text-decoration:none; padding:10px 18px; border-radius:999px; font-weight:600;"
        >
          Redefinir senha
        </a>
      </p>
      <p>Ou copie e cole este link no seu navegador:</p>
      <p style="word-break: break-all; color:#0369a1;">${resetUrl}</p>
      <p style="margin-top:16px; font-size:13px; color:#64748b;">
        Se você não fez esta solicitação, pode ignorar este email com segurança.
      </p>
      <p style="margin-top:8px; font-size:13px; color:#64748b;">
        Este link é válido por <strong>1 hora</strong>.
      </p>
      <p style="margin-top:24px;">Equipe <strong>FineixoApp</strong></p>
    </div>
  `;

  await transporter.sendMail({
    from: fromEmail,
    to,
    subject,
    text,
    html,
  });
}


