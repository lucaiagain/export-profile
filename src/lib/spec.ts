// Spec attiva del metodo. Per cambiare versione: aggiungere il nuovo file in /spec e aggiornare l'import.
import type { Spec } from "@/lib/engine";
import specJson from "../../spec/export_profile_spec_v1.1.0.json";

export const spec = specJson as unknown as Spec;

/** Testo dalla spec, con sostituzione dei segnaposto {nome}. */
export function t(key: string, vars: Record<string, string | number> = {}): string {
  const raw = spec.texts[key];
  if (typeof raw !== "string") throw new Error(`Testo mancante nella spec: texts.${key}`);
  return fill(raw, vars);
}

export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export const anagText = spec.texts.anag as Record<string, string>;
export const indicatorById = Object.fromEntries(spec.indicators.map((d) => [d.id, d]));
export const areaById = Object.fromEntries(spec.areas.map((a) => [a.id, a]));
export const blockerById = Object.fromEntries(spec.blockers.map((b) => [b.id, b]));
