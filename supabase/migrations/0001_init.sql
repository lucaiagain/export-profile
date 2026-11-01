-- Export Profile IAGAIN – schema iniziale.
-- Progetto Supabase dedicato, separato da M.IA. Nessuna lettura pubblica:
-- tutte le operazioni passano dal server con la chiave service role.

create extension if not exists pgcrypto;

create table public.profiles (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  last_activity_at  timestamptz not null default now(),
  completed_at      timestamptz,
  spec_version      text not null,
  status            text not null default 'in_corso' check (status in ('in_corso', 'completato')),
  -- accesso del lead: hash del token del link personale (per la ricerca)
  token_hash        text not null unique,
  -- token cifrato (AES-256-GCM, chiave TOKEN_ENC_KEY) per i link nei promemoria
  token_enc         text not null,
  -- anagrafica
  company_name      text not null,
  contact_name      text not null,
  role              text,
  email             text not null,
  phone             text not null,
  region            text,
  website           text,
  no_website        boolean not null default false,
  category          text not null,
  -- consensi
  privacy_at        timestamptz not null,
  privacy_version   text not null,
  marketing_at      timestamptz,
  unsubscribed_at   timestamptz,
  -- questionario
  answers           jsonb not null default '{}'::jsonb,
  current_step      integer not null default 0,
  markets           text[] not null default '{}',
  result            jsonb,
  -- area IAGAIN
  overrides         jsonb not null default '{}'::jsonb,
  wem_notes         jsonb not null default '{}'::jsonb,
  wem_name          text,
  -- tracciamento e integrazioni
  utm               jsonb not null default '{}'::jsonb,
  sent_to_brevo_at  timestamptz,
  sent_to_mia_at    timestamptz,
  pdf_sent_at       timestamptz
);

create index profiles_status_activity on public.profiles (status, last_activity_at);
create index profiles_created on public.profiles (created_at desc);
create index profiles_email on public.profiles (lower(email));

create table public.reminders (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  n           smallint not null check (n between 1 and 3),
  sent_at     timestamptz not null default now(),
  unique (profile_id, n)
);

create table public.outbox_mia (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  profile_id       uuid not null references public.profiles (id) on delete cascade,
  payload          jsonb not null,
  attempts         integer not null default 0,
  next_attempt_at  timestamptz not null default now(),
  last_error       text,
  delivered_at     timestamptz,
  unique (profile_id)
);

create index outbox_pending on public.outbox_mia (next_attempt_at) where delivered_at is null;

-- Limite di invii per IP (finestra scorrevole, conteggio lato server).
create table public.rate_limits (
  key         text not null,
  created_at  timestamptz not null default now()
);
create index rate_limits_key_time on public.rate_limits (key, created_at);

-- RLS attiva senza policy: anon e authenticated non leggono né scrivono nulla.
alter table public.profiles   enable row level security;
alter table public.reminders  enable row level security;
alter table public.outbox_mia enable row level security;
alter table public.rate_limits enable row level security;

revoke all on public.profiles, public.reminders, public.outbox_mia, public.rate_limits from anon, authenticated;
