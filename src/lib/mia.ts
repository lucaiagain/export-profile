// Comunicazione verso M.IA: payload del profilo completato e consegna dalla outbox.
// Una sola direzione: Export Profile non legge mai il database di M.IA.
import "server-only";
import { config } from "@/lib/config";
import { db, type ProfileRow } from "@/lib/db";
import { round2 } from "@/lib/engine";
import { hmac } from "@/lib/security";

export function miaPayload(p: ProfileRow) {
  const r = p.result!;
  return {
    event: "export_profile.completed",
    profile_id: p.id,
    spec_version: p.spec_version,
    completed_at: p.completed_at,
    company: { name: p.company_name, website: p.website ?? "", no_website: p.no_website, region: p.region ?? "", category: p.category },
    contact: { name: p.contact_name, role: p.role ?? "", email: p.email, phone: p.phone },
    consents: { privacy_at: p.privacy_at, privacy_version: p.privacy_version, marketing_at: p.marketing_at },
    answers: p.answers,
    result: {
      total: round2(r.total),
      level: r.level,
      areas: Object.fromEntries(r.areas.map((a) => [a.id, round2(a.value)])),
      indicators: Object.fromEntries(Object.values(r.indicators).map((i) => [i.id, round2(i.value)])),
      recommended_service: r.recommended_service,
      scenario_total: round2(r.scenario_total),
      scenario_level: r.scenario_level,
      blockers: r.blockers,
    },
    markets_of_interest: p.markets,
    overrides: p.overrides,
    wem: p.wem_name ? { name: p.wem_name, notes: p.wem_notes } : null,
    utm: { source: p.utm.source ?? "", medium: p.utm.medium ?? "", campaign: p.utm.campaign ?? "" },
  };
}

/** Intervalli crescenti tra i tentativi, in minuti. */
const BACKOFF = [1, 5, 30, 120, 720, 1440];

/** Consegna i messaggi in attesa. Senza MIA_ENABLED restano in coda (anche quelli già raccolti). */
export async function deliverOutbox(limit = 50) {
  if (!config.miaEnabled || !config.miaEndpoint || !config.miaHmacSecret) return { delivered: 0, failed: 0, skipped: true };
  const store = db();
  const rows = await store.pendingOutbox(new Date().toISOString(), limit);
  let delivered = 0;
  let failed = 0;
  for (const row of rows) {
    const body = JSON.stringify(row.payload);
    try {
      const res = await fetch(config.miaEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-IAGAIN-Signature": hmac(body, config.miaHmacSecret),
          "Idempotency-Key": row.profile_id,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const at = new Date().toISOString();
      await store.updateOutbox(row.id, { delivered_at: at, attempts: row.attempts + 1, last_error: null });
      await store.updateProfile(row.profile_id, { sent_to_mia_at: at });
      delivered++;
    } catch (e) {
      const mins = BACKOFF[Math.min(row.attempts, BACKOFF.length - 1)];
      await store.updateOutbox(row.id, {
        attempts: row.attempts + 1,
        last_error: String(e instanceof Error ? e.message : e).slice(0, 500),
        next_attempt_at: new Date(Date.now() + mins * 60_000).toISOString(),
      });
      failed++;
    }
  }
  return { delivered, failed, skipped: false };
}
