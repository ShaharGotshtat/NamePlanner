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
  origin_he     text,
  biblical_ref  text,
  variants      text[] not null default '{}',
  tags          jsonb not null,
  features      jsonb not null default '{}'::jsonb,
  stats         jsonb not null -- [{year, count, rank}] from CBS
);

-- Columns added after the first release, for databases created before them.
alter table names add column if not exists origin_he text;
alter table names add column if not exists variants text[] not null default '{}';

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
