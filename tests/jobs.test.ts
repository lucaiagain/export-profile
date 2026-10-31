import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ep-")), "db.json");
process.env.DEV_DB_FILE = file;

const mails: { to: string; subject: string }[] = [];
vi.mock("@/lib/brevo", () => ({
  sendMail: async (m: { to: { email: string }; subject: string }) => (mails.push({ to: m.to.email, subject: m.subject }), true),
  deleteContact: async () => true,
}));

const { db } = await import("@/lib/db");
const { calendarDays, runCleanup, runReminders, dueReminder } = await import("@/lib/jobs");
const { encryptToken, hashToken, newToken } = await import("@/lib/security");

const DAY = 86_400_000;
const T0 = new Date("2026-11-02T17:00:00Z"); // ultima attività alle 18:00

async function newProfile(email: string) {
  const token = newToken();
  const p = await db().createProfile({
    spec_version: "1.1.0", token_hash: hashToken(token), token_enc: encryptToken(token),
    company_name: "Prova", contact_name: "Anna Test", role: null, email, phone: "3331234567",
    region: null, website: null, no_website: true, category: "Vino",
    privacy_at: T0.toISOString(), privacy_version: "x", marketing_at: null,
    answers: {}, current_step: 3, markets: [], utm: {},
  });
  return db().updateProfile(p.id, { last_activity_at: T0.toISOString() });
}

/** Esegue i job una volta al giorno per `days` giorni. */
async function simulate(days: number) {
  for (let d = 1; d <= days; d++) {
    const now = new Date(T0.getTime() + d * DAY);
    await runReminders(now);
    await runCleanup(now);
  }
}

beforeEach(() => {
  fs.rmSync(file, { force: true });
  mails.length = 0;
});

describe("promemoria e cancellazione (collaudo sezione 11)", () => {
  it("giorni di calendario indipendenti dall'ora", () => {
    expect(calendarDays(new Date("2026-11-02T22:30:00Z"), new Date("2026-11-04T07:00:00Z"))).toBe(2); // dalle 23:30 del 2 alle 08:00 del 4
    expect(calendarDays(new Date("2026-11-02T09:00:00Z"), new Date("2026-11-16T03:30:00Z"))).toBe(14);
  });

  it("soglie 2, 5, 10 giorni", () => {
    expect(dueReminder(1.9, [])).toBeNull();
    expect(dueReminder(2, [])).toBe(1);
    expect(dueReminder(5, [1])).toBe(2);
    expect(dueReminder(10, [1, 2])).toBe(3);
    expect(dueReminder(11, [1, 2, 3])).toBeNull();
  });

  it("lasciato a metà: promemoria ai giorni 2, 5, 10 e cancellazione al 14°", async () => {
    const p = await newProfile("meta@example.com");
    const sentOn: number[] = [];
    for (let d = 1; d <= 15; d++) {
      const before = mails.length;
      const day = new Date(Date.UTC(2026, 10, 2 + d));
      await runCleanup(new Date(day.getTime() + 2.5 * 3600_000)); // 03:30 ora italiana
      await runReminders(new Date(day.getTime() + 7 * 3600_000)); // 08:00
      if (mails.length > before) sentOn.push(d);
      if (d === 13) expect(await db().getProfile(p.id)).not.toBeNull();
      if (d === 14) expect(await db().getProfile(p.id)).toBeNull();
    }
    expect(sentOn).toEqual([2, 5, 10]);
  });

  it("completato: nessun promemoria e nessuna cancellazione", async () => {
    const p = await newProfile("ok@example.com");
    await db().updateProfile(p.id, { status: "completato" });
    await simulate(20);
    expect(mails).toHaveLength(0);
    expect(await db().getProfile(p.id)).not.toBeNull();
  });

  it("disiscritto: nessun promemoria", async () => {
    const p = await newProfile("no@example.com");
    await db().updateProfile(p.id, { unsubscribed_at: T0.toISOString() });
    await simulate(12);
    expect(mails).toHaveLength(0);
  });
});
