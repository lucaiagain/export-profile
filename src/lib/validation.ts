// Validazione degli input pubblici: anagrafica, risposte, mercati. Tutto controllato contro la spec.
import { z } from "zod";
import type { Answers } from "@/lib/engine";
import { spec } from "@/lib/spec";

const categories = spec.categories.map((c) => c.label);

export const anagSchema = z
  .object({
    company_name: z.string().trim().min(1).max(200),
    contact_name: z.string().trim().min(1).max(200),
    role: z.string().trim().max(120).optional().default(""),
    email: z.string().trim().toLowerCase().email().max(254),
    phone: z
      .string()
      .trim()
      .max(40)
      .refine((s) => s.replace(/\D/g, "").length >= 6, "almeno 6 cifre"),
    region: z.string().trim().max(80).optional().default(""),
    website: z.string().trim().max(300).optional().default(""),
    no_website: z.boolean().default(false),
    category: z.string().refine((c) => categories.includes(c), "categoria non valida"),
    privacy: z.literal(true),
    marketing: z.boolean().default(false),
  })
  .refine((a) => a.no_website || a.website.length > 0, { path: ["website"], message: "sito obbligatorio" });

export type Anag = z.infer<typeof anagSchema>;

/** Tiene solo risposte valide secondo la spec (chiavi di domande e opzioni esistenti). */
export function sanitizeAnswers(input: unknown): Answers {
  const out: Answers = {};
  if (!input || typeof input !== "object") return out;
  const src = input as Record<string, unknown>;
  for (const q of spec.questions) {
    const v = src[q.id];
    if (q.type === "single") {
      if (typeof v === "string" && q.options.some((o) => o.key === v)) out[q.id] = v;
    } else if (Array.isArray(v)) {
      const keys = v.filter((k): k is string => typeof k === "string" && q.options.some((o) => o.key === k));
      const excl = q.options.find((o) => o.exclusive && keys.includes(o.key));
      if (keys.length) out[q.id] = excl ? [excl.key] : [...new Set(keys)];
    }
  }
  return out;
}

export function sanitizeMarkets(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.filter((m): m is string => typeof m === "string" && spec.markets_of_interest.includes(m)))];
}

/** Risposte complete per il motore: risposte + campi dell'anagrafica usati nel calcolo. */
export function engineAnswers(answers: Answers, category: string, noWebsite: boolean): Answers {
  return { ...answers, categoria: category, nosito: noWebsite };
}
