// Template delle email di accesso dello staff, da incollare in Supabase
// (Authentication → Emails → Templates). {{ .ConfirmationURL }} e {{ .Email }} li sostituisce Supabase.
import { button, kicker, layout, p } from "@/lib/emails";

const SITE = "https://exportprofile.iagain.it";
const muted = "font-size:14px;color:#4A5063";

const staffBody = (title: string, intro: string, cta: string) =>
  kicker("Area IAGAIN") +
  `<div style="font-size:24px;font-weight:900;line-height:1.25;margin:0 0 16px">${title}</div>` +
  p(intro) +
  button("{{ .ConfirmationURL }}", cta) +
  p("Il link vale 1 ora e funziona una sola volta: aprilo dal dispositivo da cui l'hai richiesto.", muted) +
  p("Se non hai chiesto tu l'accesso, ignora questa email: senza il link nessuno può entrare.", muted);

const footer = "Email di servizio inviata a {{ .Email }} per l'area riservata allo staff IAGAIN.";

export const staffTemplates = [
  {
    file: "link-accesso.html",
    supabase: "Magic Link",
    subject: "Il tuo link di accesso all'area IAGAIN",
    html: layout({
      site: SITE,
      preheader: "Un clic per entrare nell'area staff dell'Export Profile.",
      body: staffBody("Accedi all'area IAGAIN", "Ecco il link per entrare nell'area staff dell'Export Profile: elenco dei profili, modalità WEM e PDF.", "Entra nell'area IAGAIN"),
      footer,
    }),
  },
  {
    file: "conferma-registrazione.html",
    supabase: "Confirm signup",
    subject: "Benvenuto nell'area IAGAIN dell'Export Profile",
    html: layout({
      site: SITE,
      preheader: "Conferma il tuo indirizzo e accedi all'area staff.",
      body: staffBody("Benvenuto nell'area IAGAIN", "È il tuo primo accesso all'area staff dell'Export Profile. Da qui consulti i profili dei lead, li verifichi in modalità WEM con correzioni e note, e generi il PDF aggiornato.", "Conferma ed entra"),
      footer,
    }),
  },
  {
    file: "invito.html",
    supabase: "Invite user",
    subject: "Sei stato invitato nell'area IAGAIN dell'Export Profile",
    html: layout({
      site: SITE,
      preheader: "Accetta l'invito e accedi all'area staff.",
      body: staffBody("Ti diamo il benvenuto", "Sei stato invitato nell'area staff dell'Export Profile IAGAIN, dove si consultano e si verificano i profili export dei lead.", "Accetta l'invito"),
      footer,
    }),
  },
];
