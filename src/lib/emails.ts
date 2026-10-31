// Testi delle email (promemoria e invio del PDF). HTML semplice, compatibile con i client di posta.
import "server-only";
import { config } from "@/lib/config";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(body: string, footer: string) {
  return `<!doctype html><html lang="it"><body style="margin:0;background:#F4F5F7;font-family:Lato,Helvetica,Arial,sans-serif;color:#1F232F">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #DDE0E6;border-radius:10px">
<tr><td style="background:#1F232F;border-radius:10px 10px 0 0;padding:18px 24px;color:#AD9677;font-size:13px;letter-spacing:.14em;text-transform:uppercase;font-weight:700">IAGAIN · Export Profile</td></tr>
<tr><td style="padding:28px 24px;font-size:16px;line-height:1.55">${body}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #DDE0E6;font-size:12px;line-height:1.5;color:#4A5063">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:#A3195B;color:#FFFFFF;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:6px">${esc(label)}</a></p>`;

const SUBJECTS = [
  "Il tuo Export Profile ti aspetta",
  "Mancano poche domande al tuo Export Profile",
  "Ultimo promemoria: il tuo Export Profile",
];

export function reminderEmail(p: { contact_name: string; company_name: string }, n: number, resumeUrl: string, unsubscribeUrl: string, deleteInDays: number) {
  const name = p.contact_name.split(/\s+/)[0];
  const last = n >= 3;
  const body = `<p style="margin:0 0 12px">Ciao ${esc(name)},</p>
<p style="margin:0 0 12px">hai iniziato l'Export Profile di <b>${esc(p.company_name)}</b> ma non l'hai ancora completato. Le risposte che hai dato sono salvate: puoi riprendere da dove eri rimasto.</p>
<p style="margin:0">Alla fine ricevi subito il grado di maturità export dell'azienda, i punti di forza e di debolezza nelle 4 aree e fin dove puoi arrivare con IAGAIN.</p>
${button(resumeUrl, "Riprendi il questionario")}
${last ? `<p style="margin:0;color:#4A5063;font-size:14px">È l'ultimo promemoria. Se non completi il questionario, le risposte vengono cancellate tra ${deleteInDays} giorni.</p>` : ""}`;
  const footer = `Ricevi questa email perché hai iniziato l'Export Profile su ${esc(config.siteUrl.replace(/^https?:\/\//, ""))}. <a href="${esc(unsubscribeUrl)}" style="color:#A3195B">Non voglio ricevere altri promemoria</a>.<br>IAGAIN S.r.l. · www.iagain.it`;
  return { subject: SUBJECTS[Math.min(n, 3) - 1], html: layout(body, footer) };
}

export function pdfEmail(p: { contact_name: string; company_name: string }, profileUrl: string) {
  const name = p.contact_name.split(/\s+/)[0];
  const body = `<p style="margin:0 0 12px">Ciao ${esc(name)},</p>
<p style="margin:0 0 12px">in allegato trovi l'Export Profile di <b>${esc(p.company_name)}</b> in PDF.</p>
<p style="margin:0">Puoi rivederlo online in qualsiasi momento da questo link personale.</p>
${button(profileUrl, "Apri il tuo Export Profile")}
<p style="margin:0;color:#4A5063;font-size:14px">Vuoi parlarne con un nostro WIFO Export Manager? Trovi il link per prenotare la call nell'ultima pagina del PDF.</p>`;
  const footer = `Email inviata su tua richiesta da ${esc(config.mailFrom)}.<br>IAGAIN S.r.l. · www.iagain.it`;
  return { subject: `Il tuo Export Profile – ${p.company_name}`, html: layout(body, footer) };
}
