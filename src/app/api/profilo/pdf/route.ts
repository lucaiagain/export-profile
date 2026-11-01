import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { pdfEmail } from "@/lib/emails";
import { profileFromRequest } from "@/lib/lead-access";
import { pdfFileName, renderProfilePdf } from "@/lib/pdf";
import { bearer } from "@/lib/security";
import { viewForRow } from "@/lib/profile-view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const p = await profileFromRequest(req);
  if (!p || p.status !== "completato" || !p.result) return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });
  if (await db().rateLimit(`pdf:${p.id}`, 3600, 5)) return NextResponse.json({ error: "Hai già richiesto il PDF più volte: riprova più tardi." }, { status: 429 });

  const pdf = await renderProfilePdf(viewForRow(p));
  const mail = pdfEmail(p, `${config.siteUrl}/profilo/${bearer(req)}`);
  const sent = await sendMail({
    to: { email: p.email, name: p.contact_name },
    subject: mail.subject,
    html: mail.html,
    attachment: { name: pdfFileName(p.company_name), content: pdf },
  });
  if (!sent && process.env.NODE_ENV === "production")
    return NextResponse.json({ error: "L'invio delle email non è ancora attivo. Riprova nei prossimi giorni." }, { status: 503 });
  await db().updateProfile(p.id, { pdf_sent_at: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
