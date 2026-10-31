// Job pianificati: promemoria per i questionari non completati e cancellazione dopo RETENTION_DAYS.
import "server-only";
import { deleteContact, sendMail } from "@/lib/brevo";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { reminderEmail } from "@/lib/emails";
import { decryptToken } from "@/lib/security";

const DAY = 86_400_000;

/** Giorni di calendario (ora italiana) tra due istanti: i job girano una volta al giorno. */
export function calendarDays(from: Date, to: Date) {
  const day = (d: Date) => {
    const [y, m, dd] = d.toLocaleDateString("en-CA", { timeZone: "Europe/Rome" }).split("-").map(Number);
    return Date.UTC(y, m - 1, dd);
  };
  return Math.round((day(to) - day(from)) / DAY);
}

/** Quale promemoria spetta (1-3) a un questionario fermo da `idleDays`, dati quelli già inviati. */
export function dueReminder(idleDays: number, sent: number[], days = config.reminderDays): number | null {
  let due: number | null = null;
  days.forEach((d, i) => {
    if (idleDays >= d && !sent.includes(i + 1)) due = i + 1;
  });
  // se più soglie sono passate insieme (job fermo) parte solo l'ultimo promemoria dovuto
  return due;
}

export async function runReminders(now = new Date()) {
  const store = db();
  const first = Math.min(...config.reminderDays);
  const stale = await store.listStale(new Date(now.getTime() - (first - 1) * DAY).toISOString());
  let sent = 0;
  for (const p of stale) {
    if (p.unsubscribed_at) continue;
    const idle = calendarDays(new Date(p.last_activity_at), now);
    if (idle >= config.retentionDays) continue;
    const already = await store.remindersSent(p.id);
    const n = dueReminder(idle, already);
    if (!n) continue;
    const token = decryptToken(p.token_enc);
    const mail = reminderEmail(
      p,
      n,
      `${config.siteUrl}/questionario?k=${token}`,
      `${config.siteUrl}/disiscriviti/${token}`,
      Math.max(1, Math.ceil(config.retentionDays - idle)),
    );
    await sendMail({ to: { email: p.email, name: p.contact_name }, subject: mail.subject, html: mail.html });
    for (let k = 1; k <= n; k++) if (!already.includes(k)) await store.addReminder(p.id, k);
    sent++;
  }
  return { checked: stale.length, sent };
}

export async function runCleanup(now = new Date()) {
  const store = db();
  const candidates = await store.listStale(new Date(now.getTime() - (config.retentionDays - 1) * DAY).toISOString());
  const stale = candidates.filter((p) => calendarDays(new Date(p.last_activity_at), now) >= config.retentionDays);
  for (const p of stale) {
    if (p.sent_to_brevo_at) {
      try {
        await deleteContact(p.email);
      } catch (e) {
        console.error("Brevo: contatto non rimosso", p.id, e);
        continue; // si riprova al prossimo giro, senza perdere la traccia
      }
    }
    await store.deleteProfile(p.id);
  }
  return { deleted: stale.length };
}
