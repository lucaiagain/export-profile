// Brevo: solo contatti (CRM). Le email partono via SMTP (src/lib/mail.ts).
import "server-only";
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
