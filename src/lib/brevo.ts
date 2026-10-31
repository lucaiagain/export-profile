// Brevo: contatti e email transazionali. Con BREVO_ENABLED=false non parte nulla:
// in sviluppo le email finiscono in .data/mail/ per poterle controllare.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { config } from "@/lib/config";

const API = "https://api.brevo.com/v3";

async function call(method: string, url: string, body?: unknown) {
  const res = await fetch(API + url, {
    method,
    headers: { "api-key": config.brevoApiKey, "content-type": "application/json", accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 404) throw new Error(`Brevo ${method} ${url}: ${res.status} ${await res.text()}`);
  return res;
}

export const brevoActive = () => config.brevoEnabled && !!config.brevoApiKey;

/** Crea o aggiorna il contatto. Gli attributi EP_* vanno creati prima in Brevo (vedi README). */
export async function upsertContact(email: string, attributes: Record<string, string | number | boolean>) {
  if (!brevoActive()) return false;
  await call("POST", "/contacts", {
    email,
    attributes,
    updateEnabled: true,
    ...(config.brevoListId ? { listIds: [config.brevoListId] } : {}),
  });
  return true;
}

export async function deleteContact(email: string) {
  if (!brevoActive()) return false;
  await call("DELETE", `/contacts/${encodeURIComponent(email)}`);
  return true;
}

export interface Mail {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  attachment?: { name: string; content: Buffer };
}

/** Invia un'email transazionale. Restituisce false se l'invio è disattivato. */
export async function sendMail(m: Mail): Promise<boolean> {
  if (!brevoActive()) {
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
  await call("POST", "/smtp/email", {
    sender: { email: config.mailFrom, name: config.mailFromName },
    to: [m.to],
    subject: m.subject,
    htmlContent: m.html,
    ...(m.attachment ? { attachment: [{ name: m.attachment.name, content: m.attachment.content.toString("base64") }] } : {}),
  });
  return true;
}
