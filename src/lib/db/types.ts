import type { Answers, Overrides, ProfileResult } from "@/lib/engine";

export type ProfileStatus = "in_corso" | "completato";

export interface ProfileRow {
  id: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  completed_at: string | null;
  spec_version: string;
  status: ProfileStatus;
  token_hash: string;
  token_enc: string;
  company_name: string;
  contact_name: string;
  role: string | null;
  email: string;
  phone: string;
  region: string | null;
  website: string | null;
  no_website: boolean;
  category: string;
  privacy_at: string;
  privacy_version: string;
  marketing_at: string | null;
  unsubscribed_at: string | null;
  answers: Answers;
  current_step: number;
  markets: string[];
  result: ProfileResult | null;
  overrides: Overrides;
  wem_notes: Record<string, string>;
  wem_name: string | null;
  utm: Record<string, string>;
  sent_to_brevo_at: string | null;
  sent_to_mia_at: string | null;
  pdf_sent_at: string | null;
}

export type NewProfile = Omit<
  ProfileRow,
  | "id"
  | "created_at"
  | "updated_at"
  | "last_activity_at"
  | "completed_at"
  | "status"
  | "unsubscribed_at"
  | "result"
  | "overrides"
  | "wem_notes"
  | "wem_name"
  | "sent_to_brevo_at"
  | "sent_to_mia_at"
  | "pdf_sent_at"
>;

export interface OutboxRow {
  id: string;
  created_at: string;
  profile_id: string;
  payload: unknown;
  attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  delivered_at: string | null;
}

export interface ProfileFilters {
  from?: string;
  to?: string;
  level?: string;
  service?: string;
  category?: string;
  status?: ProfileStatus;
}

export interface Store {
  createProfile(p: NewProfile): Promise<ProfileRow>;
  getProfile(id: string): Promise<ProfileRow | null>;
  getProfileByTokenHash(hash: string): Promise<ProfileRow | null>;
  updateProfile(id: string, patch: Partial<ProfileRow>): Promise<ProfileRow>;
  deleteProfile(id: string): Promise<void>;
  listProfiles(f: ProfileFilters): Promise<ProfileRow[]>;
  /** Questionari in corso con ultima attività precedente a `before`. */
  listStale(before: string): Promise<ProfileRow[]>;

  remindersSent(profileId: string): Promise<number[]>;
  addReminder(profileId: string, n: number): Promise<void>;

  enqueueOutbox(profileId: string, payload: unknown): Promise<void>;
  pendingOutbox(now: string, limit: number): Promise<OutboxRow[]>;
  updateOutbox(id: string, patch: Partial<OutboxRow>): Promise<void>;

  /** Registra un evento e dice se il limite è superato nella finestra. */
  rateLimit(key: string, windowSec: number, max: number): Promise<boolean>;
}
