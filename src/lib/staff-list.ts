import "server-only";
import { db, type ProfileFilters, type ProfileRow } from "@/lib/db";
import { fmt } from "@/lib/engine";
import { blockerById, spec } from "@/lib/spec";

export function filtersFrom(sp: Record<string, string | undefined>): ProfileFilters {
  const date = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
  return {
    from: date(sp.dal),
    to: date(sp.al),
    level: spec.levels.some((l) => l.name === sp.grado) ? sp.grado : undefined,
    service: sp.servizio && sp.servizio in spec.services ? sp.servizio : undefined,
    category: spec.categories.some((c) => c.label === sp.categoria) ? sp.categoria : undefined,
    status: sp.stato === "in_corso" || sp.stato === "completato" ? sp.stato : undefined,
  };
}

export const listProfiles = (f: ProfileFilters) => db().listProfiles(f);

const dt = (s: string | null) => (s ? new Date(s).toLocaleString("it-IT", { timeZone: "Europe/Rome" }) : "");

export function csv(rows: ProfileRow[]): string {
  const head = [
    "data", "stato", "azienda", "referente", "ruolo", "email", "telefono", "regione", "sito", "categoria",
    "grado", "livello", "servizio", "scenario", "livello_scenario", "bloccanti",
    ...spec.areas.map((a) => `area_${a.id}`),
    ...spec.indicators.map((d) => `ind_${d.id}`),
    "mercati", "consenso_marketing", "wem", "utm_source", "utm_medium", "utm_campaign", "spec",
  ];
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((p) => {
    const r = p.result;
    return [
      dt(p.created_at), p.status, p.company_name, p.contact_name, p.role, p.email, p.phone, p.region,
      p.no_website ? "nessun sito" : p.website, p.category,
      r ? fmt(r.total) : "", r?.level, r ? spec.services[r.recommended_service].name : "",
      r ? fmt(r.scenario_total) : "", r?.scenario_level, r?.blockers.map((b) => blockerById[b].title).join(", "),
      ...spec.areas.map((a) => { const x = r?.areas.find((y) => y.id === a.id); return x ? fmt(x.value) : ""; }),
      ...spec.indicators.map((d) => (r ? fmt(r.indicators[d.id].value) : "")),
      p.markets.join(", "), p.marketing_at ? "sì" : "no", p.wem_name, p.utm.source, p.utm.medium, p.utm.campaign, p.spec_version,
    ].map(cell).join(";");
  });
  // separatore ";" e BOM: Excel in italiano lo apre correttamente
  return "﻿" + [head.join(";"), ...lines].join("\r\n");
}
