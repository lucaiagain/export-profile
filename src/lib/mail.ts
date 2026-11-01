// Invio delle email (promemoria, PDF) via SMTP: in produzione il server di Aruba.
// Senza SMTP_HOST non parte nulla; in sviluppo le email finiscono in .data/mail/ per poterle controllare.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { config } from "@/lib/config";

export interface Mail {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  attachment?: { name: string; content: Buffer };
}

export const mailActive = () => !!config.smtpHost && !!config.smtpUser && !!config.smtpPass;

let transport: Transporter | undefined;
function smtp() {
  transport ??= nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465, // 465 = SSL; 587 = STARTTLS
    auth: { user: config.smtpUser, pass: config.smtpPass },
    connectionTimeout: 15_000,
  });
  return transport;
}

/** Invia un'email. Restituisce false se l'invio non è configurato. */
export async function sendMail(m: Mail): Promise<boolean> {
  if (!mailActive()) {
    if (process.env.NODE_ENV !== "production") {
      const dir = path.join(process.cwd(), ".data", "mail");
      fs.mkdirSync(dir, { recursive: true });
      const base = `${new Date().toISOString().replace(/[:.]/g, "-")}_${m.to.email.replace(/[^a-z0-9]/gi, "_")}`;
      fs.writeFileSync(path.join(dir, base + ".html"), `<!-- A: ${m.to.email} · Oggetto: ${m.subject} -->\n${m.html}`);
      if (m.attachment) fs.writeFileSync(path.join(dir, base + "_" + m.attachment.name), m.attachment.content);
    }
    console.info(`[mail disattivata] ${m.to.email} · ${m.subject}`);
    return false;
  }
  await smtp().sendMail({
    from: { name: config.mailFromName, address: config.mailFrom },
    ...(config.mailReplyTo ? { replyTo: config.mailReplyTo } : {}),
    to: m.to.name ? { name: m.to.name, address: m.to.email } : m.to.email,
    subject: m.subject,
    html: m.html,
    ...(m.attachment ? { attachments: [{ filename: m.attachment.name, content: m.attachment.content, contentType: "application/pdf" }] } : {}),
  });
  return true;
}
