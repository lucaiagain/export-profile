// Configurazione da variabili d'ambiente (solo server). Vedi .env.example.
import "server-only";

const env = (k: string, d = "") => process.env[k] ?? d;
const flag = (k: string) => env(k).toLowerCase() === "true";

export const config = {
  siteUrl: env("SITE_URL", "http://localhost:3000").replace(/\/$/, ""),
  privacyVersion: env("PRIVACY_VERSION", "2026-10-31"),

  supabaseUrl: env("SUPABASE_URL"),
  supabaseServiceKey: env("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseAnonKey: env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  /** Senza Supabase, in sviluppo, i dati vanno in .data/dev-db.json */
  get useDevStore() {
    return !this.supabaseUrl && process.env.NODE_ENV !== "production";
  },

  /** Promemoria: giorni dall'ultima attività, separati da virgola (massimo 3). */
  reminderDays: env("REMINDER_DAYS", "2,5,10")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => n > 0)
    .slice(0, 3),
  /** Cancellazione dei questionari non completati, in giorni dall'ultima attività. */
  retentionDays: Number(env("RETENTION_DAYS", "14")),

  brevoEnabled: flag("BREVO_ENABLED"),
  brevoApiKey: env("BREVO_API_KEY"),
  brevoListId: env("BREVO_LIST_ID") ? Number(env("BREVO_LIST_ID")) : undefined,
  mailFrom: env("MAIL_FROM", "exportprofile@iagain.it"),
  mailFromName: env("MAIL_FROM_NAME", "IAGAIN Export Profile"),

  miaEnabled: flag("MIA_ENABLED"),
  miaEndpoint: env("MIA_ENDPOINT"),
  miaHmacSecret: env("MIA_HMAC_SECRET"),

  turnstileSecret: env("TURNSTILE_SECRET_KEY"),
  /** Profili avviati per IP in un'ora. */
  rateLimitPerHour: Number(env("RATE_LIMIT_PER_HOUR", "10")),

  cronSecret: env("CRON_SECRET"),
  /** 32 byte in base64 per cifrare i token dei link personali. */
  tokenEncKey: env("TOKEN_ENC_KEY"),
  staffDomain: env("STAFF_EMAIL_DOMAIN", "iagain.it"),
};
