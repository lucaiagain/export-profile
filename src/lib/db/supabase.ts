import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";
import type { OutboxRow, ProfileFilters, ProfileRow, Store } from "./types";

type PgError = { message: string; code?: string; details?: string | null; hint?: string | null };

function fail(e: PgError, status?: number): never {
  const parts = [e.message || "errore senza messaggio", e.code && `codice ${e.code}`, status && `HTTP ${status}`, e.details, e.hint];
  throw new Error("Supabase: " + parts.filter(Boolean).join(" · "));
}

function must<T>(r: { data: T | null; error: PgError | null; status?: number }): T {
  if (r.error) fail(r.error, r.status);
  return r.data as T;
}

export class SupabaseStore implements Store {
  private db: SupabaseClient;
  constructor() {
    this.db = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async createProfile(p: Parameters<Store["createProfile"]>[0]) {
    return must(await this.db.from("profiles").insert(p).select().single()) as ProfileRow;
  }
  async getProfile(id: string) {
    return must(await this.db.from("profiles").select().eq("id", id).maybeSingle()) as ProfileRow | null;
  }
  async getProfileByTokenHash(hash: string) {
    return must(await this.db.from("profiles").select().eq("token_hash", hash).maybeSingle()) as ProfileRow | null;
  }
  async updateProfile(id: string, patch: Partial<ProfileRow>) {
    return must(
      await this.db
        .from("profiles")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single(),
    ) as ProfileRow;
  }
  async deleteProfile(id: string) {
    must(await this.db.from("profiles").delete().eq("id", id));
  }
  async listProfiles(f: ProfileFilters) {
    let q = this.db.from("profiles").select().order("created_at", { ascending: false }).limit(2000);
    if (f.from) q = q.gte("created_at", f.from);
    if (f.to) q = q.lte("created_at", f.to + "T23:59:59Z");
    if (f.status) q = q.eq("status", f.status);
    if (f.category) q = q.eq("category", f.category);
    if (f.level) q = q.eq("result->>level", f.level);
    if (f.service) q = q.eq("result->>recommended_service", f.service);
    return must(await q) as ProfileRow[];
  }
  async listStale(before: string) {
    return must(
      await this.db.from("profiles").select().eq("status", "in_corso").lt("last_activity_at", before),
    ) as ProfileRow[];
  }

  async remindersSent(profileId: string) {
    const rows = must(await this.db.from("reminders").select("n").eq("profile_id", profileId)) as { n: number }[];
    return rows.map((r) => r.n);
  }
  async addReminder(profileId: string, n: number) {
    must(await this.db.from("reminders").insert({ profile_id: profileId, n }));
  }

  async enqueueOutbox(profileId: string, payload: unknown) {
    must(
      await this.db
        .from("outbox_mia")
        .upsert(
          { profile_id: profileId, payload, attempts: 0, next_attempt_at: new Date().toISOString(), delivered_at: null },
          { onConflict: "profile_id" },
        ),
    );
  }
  async pendingOutbox(now: string, limit: number) {
    return must(
      await this.db
        .from("outbox_mia")
        .select()
        .is("delivered_at", null)
        .lte("next_attempt_at", now)
        .order("next_attempt_at")
        .limit(limit),
    ) as OutboxRow[];
  }
  async updateOutbox(id: string, patch: Partial<OutboxRow>) {
    must(await this.db.from("outbox_mia").update(patch).eq("id", id));
  }

  async rateLimit(key: string, windowSec: number, max: number) {
    const since = new Date(Date.now() - windowSec * 1000).toISOString();
    // GET (non HEAD): in caso di errore PostgREST restituisce il dettaglio
    const { count, error, status } = await this.db
      .from("rate_limits")
      .select("key", { count: "exact" })
      .eq("key", key)
      .gte("created_at", since)
      .limit(1);
    if (error) fail(error, status);
    if ((count ?? 0) >= max) return true;
    must(await this.db.from("rate_limits").insert({ key }));
    // pulizia occasionale delle righe vecchie
    if (Math.random() < 0.05) await this.db.from("rate_limits").delete().lt("created_at", since);
    return false;
  }
}
