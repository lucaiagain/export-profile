// Email dell'Export Profile (promemoria, PDF) e layout comune, usato anche per i template
// di accesso dello staff in Supabase (scripts/email-templates.ts). HTML a tabelle, compatibile
// con Gmail, Outlook e Apple Mail; loghi in PNG perché molti client non mostrano gli SVG.
import { fmt, type ProfileResult } from "@/lib/engine";
import { blockerById, spec } from "@/lib/spec";

const C = { blue: "#1F232F", gold: "#AD9677", goldText: "#7A6747", goldLight: "#F3EEE6", purple: "#A3195B", muted: "#4A5063", line: "#DDE0E6", bg: "#F4F5F7" };
const FONT = "Lato,'Helvetica Neue',Helvetica,Arial,sans-serif";
const COND = "'Barlow Semi Condensed','Arial Narrow',Arial,sans-serif";

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const firstName = (full: string) => esc(full.trim().split(/\s+/)[0] ?? "");

export interface LayoutOptions {
  /** URL pubblico del sito, per i loghi (es. https://exportprofile.iagain.it) */
  site: string;
  /** testo di anteprima mostrato dai client accanto all'oggetto */
  preheader: string;
  body: string;
  /** righe del piede, già in HTML */
  footer: string;
}

export function layout({ site, preheader, body, footer }: LayoutOptions) {
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&family=Barlow+Semi+Condensed:wght@600;700&display=swap" rel="stylesheet">
<title>Export Profile IAGAIN</title></head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg}">${esc(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid ${C.line};border-radius:10px;border-collapse:separate">
<tr><td style="background:${C.blue};border-radius:10px 10px 0 0;padding:16px 28px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td><img src="${site}/email/iagain-negativo.png" width="66" height="56" alt="IAGAIN" style="display:block;border:0"></td>
    <td align="right" style="font-family:${COND};font-weight:600;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.gold}">Export Profile · metodo WIFO®</td>
  </tr></table>
</td></tr>
<tr><td style="padding:32px 28px 28px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.blue}">${body}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid ${C.line}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font-family:${FONT};font-size:12px;line-height:1.55;color:${C.muted}">${footer}<br>IAGAIN S.r.l. · <a href="https://www.iagain.it" style="color:${C.muted}">www.iagain.it</a></td>
    <td align="right" valign="bottom" width="90"><img src="${site}/email/wifo.png" width="75" height="24" alt="WIFO" style="display:block;border:0;margin-left:auto"></td>
  </tr></table>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export const p = (html: string, extra = "") => `<p style="margin:0 0 14px;${extra}">${html}</p>`;

export const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0"><tr><td style="background:${C.purple};border-radius:6px">
<a href="${esc(href)}" style="display:inline-block;padding:15px 26px;font-family:${FONT};font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none">${esc(label)}</a>
</td></tr></table>`;

export const kicker = (t: string, color = C.goldText) =>
  `<div style="font-family:${COND};font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${color};margin:0 0 6px">${esc(t)}</div>`;

const signature = p(`A presto,<br><b>Il team IAGAIN</b>`, "margin-top:22px");

/* ---------- Promemoria ---------- */

export interface ReminderData {
  site: string;
  resumeUrl: string;
  unsubscribeUrl: string;
  deleteInDays: number;
  answered: number;
  total: number;
}

function progressBar(answered: number, total: number) {
  const pct = Math.max(4, Math.min(100, Math.round((answered / total) * 100)));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;border-collapse:separate"><tr>
<td width="${pct}%" style="background:${C.purple};height:8px;border-radius:4px 0 0 4px;font-size:0;line-height:0">&nbsp;</td>
<td style="background:${C.line};height:8px;border-radius:0 4px 4px 0;font-size:0;line-height:0">&nbsp;</td>
</tr></table>
<div style="font-family:${COND};font-size:14px;color:${C.muted};margin-bottom:6px">${answered} risposte su ${total}</div>`;
}

export function reminderEmail(
  who: { contact_name: string; company_name: string },
  n: number,
  d: ReminderData,
) {
  const left = Math.max(1, d.total - d.answered);
  const minutes = Math.max(1, Math.round((left * 8) / d.total));
  const company = esc(who.company_name);
  const promise = `il grado di maturità export di ${company}, i punti di forza e di debolezza nelle 4 aree che contano per un buyer estero e fin dove potete arrivare con IAGAIN.`;

  const variants = [
    {
      subject: `${who.company_name}: il tuo Export Profile ti aspetta`,
      preheader: `Le tue risposte sono salvate: mancano circa ${minutes} minuti.`,
      text:
        p(`hai iniziato l'Export Profile di <b>${company}</b> e le tue risposte sono salvate.`) +
        p(`Ti mancano ${left === 1 ? "una domanda" : `${left} domande`}, circa ${minutes} ${minutes === 1 ? "minuto" : "minuti"}. Alla fine ricevi subito ${promise}`),
    },
    {
      subject: `Mancano ${left === 1 ? "una domanda" : `${left} domande`} al tuo Export Profile`,
      preheader: "Riprendi da dove eri rimasto: il risultato arriva subito.",
      text:
        p(`l'Export Profile di <b>${company}</b> è a metà strada. Bastano circa ${minutes} ${minutes === 1 ? "minuto" : "minuti"} per finirlo e vedere subito:`) +
        `<ul style="margin:0 0 14px;padding-left:20px">
<li style="margin-bottom:6px">il <b>grado di maturità export</b>, da 1 a 5;</li>
<li style="margin-bottom:6px">dove siete forti e dove perdete punti con i buyer esteri;</li>
<li>il passo successivo più adatto alla vostra azienda.</li></ul>`,
    },
    {
      subject: `Ultimo promemoria: l'Export Profile di ${who.company_name}`,
      preheader: `Tra ${d.deleteInDays} giorni le risposte vengono cancellate.`,
      text:
        p(`è l'ultimo promemoria per l'Export Profile di <b>${company}</b>.`) +
        p(`Se non lo completi, tra <b>${d.deleteInDays} ${d.deleteInDays === 1 ? "giorno" : "giorni"}</b> le risposte vengono cancellate, come previsto dall'informativa. Ti mancano circa ${minutes} ${minutes === 1 ? "minuto" : "minuti"}.`),
    },
  ];
  const v = variants[Math.min(Math.max(n, 1), 3) - 1];

  const body =
    p(`Ciao ${firstName(who.contact_name)},`) +
    v.text +
    progressBar(d.answered, d.total) +
    button(d.resumeUrl, "Riprendi da dove eri rimasto") +
    signature;
  const footer = `Ricevi questa email perché hai iniziato l'Export Profile su ${esc(d.site.replace(/^https?:\/\//, ""))}. <a href="${esc(d.unsubscribeUrl)}" style="color:${C.purple}">Non voglio ricevere altri promemoria</a>.`;
  return { subject: v.subject, html: layout({ site: d.site, preheader: v.preheader, body, footer }) };
}

/* ---------- Invio del PDF ---------- */

export function pdfEmail(
  who: { contact_name: string; company_name: string; result: ProfileResult | null; wem_name?: string | null },
  d: { site: string; profileUrl: string; fromMailbox: string },
) {
  const r = who.result!;
  const svc = spec.services[r.recommended_service];
  const scenario = spec.scenarios[r.recommended_service].label.replace(/^con /, "Con ");
  const company = esc(who.company_name);
  const blockers = r.blockers.map((b) => blockerById[b].title.toLowerCase());

  const summary = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.blue};border-radius:8px;margin:18px 0"><tr><td style="padding:20px 22px">
${kicker("Grado di maturità export", C.gold)}
<div style="font-family:${COND};font-weight:700;font-size:40px;line-height:1;color:#FFFFFF">${fmt(r.total)}<span style="font-size:18px;color:#C8CBD3"> / 5</span>
<span style="font-size:20px;letter-spacing:1px;text-transform:uppercase;color:${C.gold};padding-left:8px">${esc(r.level)}</span></div>
<div style="font-family:${FONT};font-size:15px;color:#E4E6EB;margin-top:10px">${esc(scenario)}: <b style="color:#E7A9C6">${fmt(r.scenario_total)} ${esc(r.scenario_level)}</b></div>
</td></tr></table>`;

  const blockersHtml = blockers.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px"><tr><td style="border-left:3px solid #9E2F2F;background:#FDF5F5;padding:12px 14px;font-size:15px;line-height:1.5;color:${C.muted}">
<b style="color:${C.blue}">Prima di tutto:</b> ${blockers.length === 1 ? "c'è un fattore che blocca" : `ci sono ${blockers.length} fattori che bloccano`} il percorso export (${esc(blockers.join(", "))}). Nel PDF trovi cosa significa.</td></tr></table>`
    : "";

  const body =
    p(`Ciao ${firstName(who.contact_name)},`) +
    p(`in allegato trovi l'<b>Export Profile di ${company}</b> in PDF, con il dettaglio delle 4 aree, i punti di forza e di debolezza e i suggerimenti.`) +
    summary +
    blockersHtml +
    kicker(svc.tag) +
    p(`<b style="font-size:18px">${esc(svc.name)}</b><br>${esc(svc.desc)}`) +
    button(spec.links[svc.cta_link], svc.cta) +
    p(`Puoi rivedere il profilo online quando vuoi: <a href="${esc(d.profileUrl)}" style="color:${C.purple}">apri il tuo Export Profile</a>.`, `font-size:15px;color:${C.muted}`) +
    (who.wem_name ? p(`Il profilo è stato verificato da <b>${esc(who.wem_name)}</b>, WEM IAGAIN.`, `font-size:15px;color:${C.muted}`) : "") +
    signature;

  const footer = `Email inviata su tua richiesta da ${esc(d.fromMailbox)}.`;
  return {
    subject: `L'Export Profile di ${who.company_name}`,
    html: layout({ site: d.site, preheader: `Grado di maturità export: ${fmt(r.total)} su 5, ${r.level}.`, body, footer }),
  };
}
