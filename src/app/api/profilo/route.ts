// Questionario del lead: avvio (POST), ripresa (GET), salvataggio automatico (PATCH).
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { db, type ProfileRow } from "@/lib/db";
import { clientState, profileFromRequest } from "@/lib/lead-access";
import { clientIp, encryptToken, hashToken, ipKey, newToken, verifyTurnstile } from "@/lib/security";
import { spec } from "@/lib/spec";
import { anagSchema, sanitizeAnswers, sanitizeMarkets, type Anag } from "@/lib/validation";

export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

function anagColumns(a: Anag, prev?: ProfileRow): Partial<ProfileRow> {
  const now = new Date().toISOString();
  return {
    company_name: a.company_name,
    contact_name: a.contact_name,
    role: a.role || null,
    email: a.email,
    phone: a.phone,
    region: a.region || null,
    website: a.no_website ? null : a.website,
    no_website: a.no_website,
    category: a.category,
    marketing_at: a.marketing ? (prev?.marketing_at ?? now) : null,
  };
}

function cleanUtm(u: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (u && typeof u === "object")
    for (const k of ["source", "medium", "campaign", "term", "content"]) {
      const v = (u as Record<string, unknown>)[k];
      if (typeof v === "string" && v) out[k] = v.slice(0, 120);
    }
  return out;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return bad("Richiesta non valida");
  const parsed = anagSchema.safeParse(body.anag);
  if (!parsed.success) return bad("Dati dell'azienda incompleti o non validi");

  if (!(await verifyTurnstile(body.turnstileToken, clientIp(req)))) return bad("Verifica anti-bot non superata", 403);
  if (await db().rateLimit(ipKey(req), 3600, config.rateLimitPerHour))
    return bad("Troppi questionari avviati da questa rete. Riprova tra un'ora.", 429);

  const token = newToken();
  const now = new Date().toISOString();
  const row = await db().createProfile({
    ...(anagColumns(parsed.data) as Required<ReturnType<typeof anagColumns>>),
    spec_version: spec.version,
    token_hash: hashToken(token),
    token_enc: encryptToken(token),
    privacy_at: now,
    privacy_version: config.privacyVersion,
    answers: {},
    current_step: 1,
    markets: [],
    utm: cleanUtm(body.utm),
  });
  return NextResponse.json({ token, state: clientState(row) });
}

export async function GET(req: Request) {
  const p = await profileFromRequest(req);
  if (!p) return bad("Questionario non trovato", 404);
  return NextResponse.json({ state: clientState(p) });
}

export async function PATCH(req: Request) {
  const p = await profileFromRequest(req);
  if (!p) return bad("Questionario non trovato", 404);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Richiesta non valida");

  const patch: Partial<ProfileRow> = { last_activity_at: new Date().toISOString() };
  if (body.anag !== undefined) {
    const parsed = anagSchema.safeParse(body.anag);
    if (!parsed.success) return bad("Dati dell'azienda incompleti o non validi");
    Object.assign(patch, anagColumns(parsed.data, p));
  }
  if (body.answers !== undefined) patch.answers = sanitizeAnswers(body.answers);
  if (body.markets !== undefined) patch.markets = sanitizeMarkets(body.markets);
  if (typeof body.step === "number" && body.step >= 0 && body.step < 100) patch.current_step = Math.floor(body.step);

  const row = await db().updateProfile(p.id, patch);
  return NextResponse.json({ ok: true, status: row.status });
}
