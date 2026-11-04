-- NamePlanner v1 schema. The server keeps no user data: only names, the spend counter,
-- QA results and feedback reports waiting for the daily email.

create table if not exists names (
  id            integer primary key,
  name_he       text not null unique,
  niqqud        text not null,
  translit      text[] not null,
  sex_ratio     real not null check (sex_ratio between 0 and 1), -- share of boys
  meaning_he    text not null,
  origin        text not null,
  biblical_ref  text,
  tags          jsonb not null,
  features      jsonb not null default '{}'::jsonb,
  stats         jsonb not null -- [{year, count, rank}] from CBS
);

create table if not exists daily_spend (
  date        date primary key,
  usd_spent   numeric(10, 4) not null default 0,
  alert_sent  boolean not null default false
);

create table if not exists app_settings (
  key    text primary key,
  value  text not null
);

create table if not exists qa_checks (
  id           bigserial primary key,
  name_id      integer not null references names (id),
  verdict      text not null check (verdict in ('pass', 'fix', 'block')),
  issue_types  text[] not null default '{}',
  created_at   timestamptz not null default now()
);

create table if not exists reports (
  id          bigserial primary key,
  type        text not null check (type in ('error', 'suggestion', 'other')),
  message     text not null check (char_length(message) <= 1000),
  context     jsonb not null,
  created_at  timestamptz not null default now()
);

-- Supabase exposes the public schema through its REST API with a key that browsers can see.
-- The app connects to Postgres directly as the table owner, so RLS with no policies blocks the API without affecting the app.
alter table names enable row level security;
alter table daily_spend enable row level security;
alter table app_settings enable row level security;
alter table qa_checks enable row level security;
alter table reports enable row level security;
