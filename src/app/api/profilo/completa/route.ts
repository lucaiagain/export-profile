import { NextResponse } from "next/server";
import { missingQuestions } from "@/lib/engine";
import { completeProfile } from "@/lib/lead";
import { profileFromRequest } from "@/lib/lead-access";
import { spec } from "@/lib/spec";
import { engineAnswers } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const p = await profileFromRequest(req);
  if (!p) return NextResponse.json({ error: "Questionario non trovato" }, { status: 404 });
  const missing = missingQuestions(spec, engineAnswers(p.answers, p.category, p.no_website));
  if (missing.length) return NextResponse.json({ error: "Risposte mancanti", missing }, { status: 400 });
  await completeProfile(p);
  return NextResponse.json({ ok: true });
}
