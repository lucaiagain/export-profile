import "server-only";
import { db, type ProfileRow } from "@/lib/db";
import { bearer, hashToken } from "@/lib/security";

/** Profilo del lead a partire dal token del link personale (header Authorization). */
export async function profileFromRequest(req: Request): Promise<ProfileRow | null> {
  const token = bearer(req);
  return token ? profileFromToken(token) : null;
}

export async function profileFromToken(token: string): Promise<ProfileRow | null> {
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) return null;
  return db().getProfileByTokenHash(hashToken(token));
}

/** Stato del questionario restituito al browser: solo ciò che serve a riprendere. */
export function clientState(p: ProfileRow) {
  return {
    status: p.status,
    step: p.current_step,
    anag: {
      company_name: p.company_name,
      contact_name: p.contact_name,
      role: p.role ?? "",
      email: p.email,
      phone: p.phone,
      region: p.region ?? "",
      website: p.website ?? "",
      no_website: p.no_website,
      category: p.category,
      privacy: true,
      marketing: !!p.marketing_at,
    },
    answers: p.answers,
    markets: p.markets,
  };
}
