// Anteprima delle email, solo in sviluppo: /dev/email?tipo=promemoria1|promemoria2|promemoria3|pdf|accesso|benvenuto
import { notFound } from "next/navigation";
import { pdfEmail, reminderEmail } from "@/lib/emails";
import { computeProfile } from "@/lib/engine";
import { SAMPLE_ANSWERS, SAMPLE_CONTACT } from "@/lib/sample";
import { spec } from "@/lib/spec";
import { staffTemplates } from "@/lib/staff-emails";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") notFound();
  const tipo = new URL(req.url).searchParams.get("tipo") ?? "pdf";
  const site = new URL(req.url).origin;
  const who = { ...SAMPLE_CONTACT, contact_name: SAMPLE_CONTACT.contact_name };
  let mail: { subject: string; html: string };
  if (tipo.startsWith("promemoria")) {
    mail = reminderEmail(who, Number(tipo.slice(-1)) || 1, { site, resumeUrl: "#", unsubscribeUrl: "#", deleteInDays: 4, answered: 9, total: 23 });
  } else if (tipo === "accesso" || tipo === "benvenuto") {
    const t = staffTemplates[tipo === "accesso" ? 0 : 1];
    mail = { subject: t.subject, html: t.html.replaceAll("https://exportprofile.iagain.it", site).replaceAll("{{ .Email }}", "luca@iagain.it") };
  } else {
    const result = computeProfile(spec, { ...SAMPLE_ANSWERS, org4: "1" });
    mail = pdfEmail({ ...who, result, wem_name: null }, { site, profileUrl: "#", fromMailbox: "exportprofile@iagain.it" });
  }
  const bar = `<div style="font:14px/1.4 system-ui;background:#fff8d6;padding:8px 12px;border-bottom:1px solid #e5d9a3">Oggetto: <b>${mail.subject.replace(/</g, "&lt;")}</b></div>`;
  return new Response(mail.html.replace(/<body([^>]*)>/, `<body$1>${bar}`), { headers: { "content-type": "text/html; charset=utf-8" } });
}
