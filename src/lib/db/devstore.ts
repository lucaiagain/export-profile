// Archivio su file per lo sviluppo locale senza Supabase (.data/dev-db.json). Mai usato in produzione.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { OutboxRow, ProfileFilters, ProfileRow, Store } from "./types";

interface Data {
  profiles: ProfileRow[];
  reminders: { profile_id: string; n: number; sent_at: string }[];
  outbox: OutboxRow[];
  rate: { key: string; at: number }[];
}

const FILE = process.env.DEV_DB_FILE ?? path.join(process.cwd(), ".data", "dev-db.json");

function load(): Data {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return { profiles: [], reminders: [], outbox: [], rate: [] };
  }
}
function save(d: Data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(d, null, 1));
}
const now = () => new Date().toISOString();

export class DevStore implements Store {
  async createProfile(p: Parameters<Store["createProfile"]>[0]) {
    const d = load();
    const row: ProfileRow = {
      ...p,
      id: randomUUID(),
      created_at: now(),
      updated_at: now(),
      last_activity_at: now(),
      completed_at: null,
      status: "in_corso",
      unsubscribed_at: null,
      result: null,
      overrides: {},
      wem_notes: {},
      wem_name: null,
      sent_to_brevo_at: null,
      sent_to_mia_at: null,
      pdf_sent_at: null,
    };
    d.profiles.push(row);
    save(d);
    return row;
  }
  async getProfile(id: string) {
    return load().profiles.find((p) => p.id === id) ?? null;
  }
  async getProfileByTokenHash(hash: string) {
    return load().profiles.find((p) => p.token_hash === hash) ?? null;
  }
  async updateProfile(id: string, patch: Partial<ProfileRow>) {
    const d = load();
    const i = d.profiles.findIndex((p) => p.id === id);
    if (i < 0) throw new Error("Profilo non trovato");
    d.profiles[i] = { ...d.profiles[i], ...patch, updated_at: now() };
    save(d);
    return d.profiles[i];
  }
  async deleteProfile(id: string) {
    const d = load();
    d.profiles = d.profiles.filter((p) => p.id !== id);
    d.reminders = d.reminders.filter((r) => r.profile_id !== id);
    d.outbox = d.outbox.filter((o) => o.profile_id !== id);
    save(d);
  }
  async listProfiles(f: ProfileFilters) {
    return load()
      .profiles.filter(
        (p) =>
          (!f.from || p.created_at >= f.from) &&
          (!f.to || p.created_at <= f.to + "T23:59:59Z") &&
          (!f.status || p.status === f.status) &&
          (!f.category || p.category === f.category) &&
          (!f.level || p.result?.level === f.level) &&
          (!f.service || p.result?.recommended_service === f.service),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async listStale(before: string) {
    return load().profiles.filter((p) => p.status === "in_corso" && p.last_activity_at < before);
  }
  async remindersSent(profileId: string) {
    return load().reminders.filter((r) => r.profile_id === profileId).map((r) => r.n);
  }
  async addReminder(profileId: string, n: number) {
    const d = load();
    d.reminders.push({ profile_id: profileId, n, sent_at: now() });
    save(d);
  }
  async enqueueOutbox(profileId: string, payload: unknown) {
    const d = load();
    d.outbox = d.outbox.filter((o) => o.profile_id !== profileId);
    d.outbox.push({
      id: randomUUID(),
      created_at: now(),
      profile_id: profileId,
      payload,
      attempts: 0,
      next_attempt_at: now(),
      last_error: null,
      delivered_at: null,
    });
    save(d);
  }
  async pendingOutbox(at: string, limit: number) {
    return load()
      .outbox.filter((o) => !o.delivered_at && o.next_attempt_at <= at)
      .slice(0, limit);
  }
  async updateOutbox(id: string, patch: Partial<OutboxRow>) {
    const d = load();
    d.outbox = d.outbox.map((o) => (o.id === id ? { ...o, ...patch } : o));
    save(d);
  }
  async rateLimit(key: string, windowSec: number, max: number) {
    const d = load();
    const since = Date.now() - windowSec * 1000;
    d.rate = d.rate.filter((r) => r.at >= since);
    const hit = d.rate.filter((r) => r.key === key).length >= max;
    if (!hit) d.rate.push({ key, at: Date.now() });
    save(d);
    return hit;
  }
}
