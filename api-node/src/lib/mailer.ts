import nodemailer, { type Transporter } from "nodemailer";

// Sends emails through Gmail (or another SMTP server) with the settings in .env:
//   SMTP_USER  the Gmail address that sends the emails
//   SMTP_PASS  a Gmail "app password" (16 letters), NOT the normal Gmail password
//   SMTP_HOST / SMTP_PORT / MAIL_FROM  optional, Gmail is the default
// Without SMTP_USER and SMTP_PASS (a new computer, or the tests) nothing is sent:
// the email is printed in the API window instead, so you can still copy the code.

export type Mail = { to: string; subject: string; text: string; html: string };

let transport: Transporter | undefined;

export const mailer = {
  async send(mail: Mail) {
    const { SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_USER || !SMTP_PASS) {
      console.log(`\n📧 Email to ${mail.to} (NOT sent: SMTP_USER / SMTP_PASS are not set in .env)\n   ${mail.subject}\n`);
      return;
    }
    const port = Number(process.env.SMTP_PORT ?? 465);
    transport ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port,
      secure: port === 465, // 465 = encrypted from the start; 587 upgrades with STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s/g, "") }, // Google shows the app password with spaces
    });
    await transport.sendMail({ from: process.env.MAIL_FROM ?? `StockFlow <${SMTP_USER}>`, ...mail });
  },
};

// Text typed by users (e.g. their name) must not become HTML inside an email.
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
