import "server-only";
import { config } from "@/lib/config";
import { DevStore } from "./devstore";
import { SupabaseStore } from "./supabase";
import type { Store } from "./types";

export * from "./types";

let store: Store | undefined;

export function db(): Store {
  if (!store) {
    if (config.useDevStore) store = new DevStore();
    else if (!config.supabaseUrl || !config.supabaseServiceKey) throw new Error("Supabase non configurato");
    else store = new SupabaseStore();
  }
  return store;
}
