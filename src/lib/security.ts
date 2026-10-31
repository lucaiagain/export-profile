import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";

/** Token del link personale: 32 byte casuali. Nel database: hash per la ricerca, copia cifrata per le email. */
export function newToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+([A-Za-z0-9_-]{20,})$/.exec(h);
  return m ? m[1] : null;
}

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
}

export function ipKey(req: Request) {
  return "ip:" + createHash("sha256").update(clientIp(req)).digest("hex").slice(0, 32);
}

export function hmac(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/** Cloudflare Turnstile. Senza chiave segreta (sviluppo) il controllo è disattivato. */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  if (!config.turnstileSecret) return process.env.NODE_ENV !== "production";
  if (!token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: config.turnstileSecret, response: token, remoteip: ip }),
  });
  const data = (await res.json()) as { success?: boolean };
  return !!data.success;
}

/** Autorizzazione dei job pianificati (Vercel Cron invia "Authorization: Bearer CRON_SECRET"). */
export function isCron(req: Request) {
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${config.cronSecret}`;
  if (!config.cronSecret) return process.env.NODE_ENV !== "production";
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

function encKey(): Buffer {
  if (config.tokenEncKey) return Buffer.from(config.tokenEncKey, "base64");
  if (process.env.NODE_ENV === "production") throw new Error("TOKEN_ENC_KEY mancante");
  return createHash("sha256").update("export-profile-dev").digest();
}

/** Cifra il token per poterlo rimettere nei link delle email (AES-256-GCM). */
export function encryptToken(token: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", encKey(), iv);
  const enc = Buffer.concat([c.update(token, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64url");
}

export function decryptToken(s: string) {
  const b = Buffer.from(s, "base64url");
  const d = createDecipheriv("aes-256-gcm", encKey(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
}
