// Flusso del lead a profilo completato: calcolo, salvataggio, Brevo, coda verso M.IA.
import "server-only";
import { brevoActive, upsertContact } from "@/lib/brevo";
import { db, type ProfileRow } from "@/lib/db";
import { computeProfile, round2 } from "@/lib/engine";
import { miaPayload } from "@/lib/mia";
import { spec, blockerById } from "@/lib/spec";
import { engineAnswers } from "@/lib/validation";

export function computeFor(p: Pick<ProfileRow, "answers" | "category" | "no_website" | "overrides">) {
  return computeProfile(spec, engineAnswers(p.answers, p.category, p.no_website), p.overrides);
}

export function brevoAttributes(p: ProfileRow) {
  const r = p.result!;
  const [first, ...rest] = p.contact_name.split(/\s+/);
  return {
    FIRSTNAME: first ?? "",
    LASTNAME: rest.join(" "),
    EP_AZIENDA: p.company_name,
    EP_PUNTEGGIO: round2(r.total),
    EP_GRADO: r.level,
    EP_SERVIZIO: spec.services[r.recommended_service].name,
    EP_BLOCCANTI: r.blockers.map((id) => blockerById[id].title).join(", "),
    EP_CATEGORIA: p.category,
    EP_MERCATI: p.markets.join(", "),
    EP_MARKETING: !!p.marketing_at,
  };
}

export async function completeProfile(p: ProfileRow): Promise<ProfileRow> {
  const store = db();
  const result = computeFor(p);
  const at = new Date().toISOString();
  let row = await store.updateProfile(p.id, {
    result,
    spec_version: spec.version,
    status: "completato",
    completed_at: p.completed_at ?? at,
    last_activity_at: at,
  });

  if (brevoActive()) {
    try {
      await upsertContact(row.email, brevoAttributes(row));
      row = await store.updateProfile(row.id, { sent_to_brevo_at: new Date().toISOString() });
    } catch (e) {
      console.error("Brevo: contatto non aggiornato", row.id, e);
    }
  }

  await store.enqueueOutbox(row.id, miaPayload(row));
  return row;
}

/** Dopo una correzione del WEM: ricalcolo e nuovo payload per M.IA, senza toccare le risposte. */
export async function recomputeProfile(p: ProfileRow): Promise<ProfileRow> {
  const store = db();
  const row = await store.updateProfile(p.id, { result: computeFor(p) });
  if (row.status === "completato") await store.enqueueOutbox(row.id, miaPayload(row));
  return row;
}
