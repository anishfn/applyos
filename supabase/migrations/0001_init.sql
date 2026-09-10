-- ApplyOS schema
--
-- Mirrors the TypeScript models in lib/types.ts. The client converts camelCase
-- fields to snake_case columns generically (lib/data/supabase-adapter.ts), so
-- adding a field means adding a column here and a property there, no mapper.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY, READ THIS
--
-- ApplyOS ships without authentication: it is designed as a personal tool you
-- run for yourself. Row Level Security is enabled below with a permissive
-- policy, which means *anyone holding your anon key can read and write this
-- data*. That is fine for a private project; it is not fine for a shared or
-- publicly-linked deployment.
--
-- If more than one person will use your instance, turn on Supabase Auth, add a
-- `user_id uuid references auth.users` column to every table, and replace the
-- permissive policies with owner checks. The commented block at the bottom of
-- this file shows the shape.
--
-- If you'd rather keep everything on your own machine, don't configure Supabase
-- at all. ApplyOS falls back to IndexedDB and nothing leaves the browser.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- Ids are text rather than uuid so imported data and non-UUID ids round-trip
-- cleanly, and so the app works in browsers without crypto.randomUUID().
create or replace function applyos_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

/* -------------------------------------------------------------------------- */
/* Core entities                                                              */
/* -------------------------------------------------------------------------- */

create table if not exists companies (
  id           text primary key,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  name         text        not null,
  domain       text,
  website      text,
  careers_url  text,
  logo_url     text,
  industry     text,
  size         text,
  location     text,
  rating       numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  notes        text,
  tags         text[]      not null default '{}',
  favorite     boolean     not null default false
);

create table if not exists resumes (
  id          text primary key,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  name        text        not null,
  version     integer     not null default 1,
  variant     text        not null default 'general',
  file_url    text,
  file_name   text,
  file_size   bigint,
  content     text,
  notes       text,
  tags        text[]      not null default '{}',
  is_default  boolean     not null default false,
  archived    boolean     not null default false
);

create table if not exists cover_letters (
  id             text primary key,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  name           text        not null,
  version        integer     not null default 1,
  is_template    boolean     not null default false,
  company_id     text references companies(id) on delete set null,
  application_id text,
  position       text,
  content        text        not null default '',
  notes          text,
  archived       boolean     not null default false
);

create table if not exists jobs (
  id                       text primary key,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  title                    text        not null,
  company_id               text        not null references companies(id) on delete cascade,
  url                      text,
  salary                   jsonb       not null default '{"min":null,"max":null,"currency":"USD","period":"year"}'::jsonb,
  location                 text,
  work_mode                text,
  employment_type          text,
  description              text,
  requirements             text[]      not null default '{}',
  skills                   text[]      not null default '{}',
  experience_years         integer,
  deadline                 date,
  source                   text,
  saved_at                 timestamptz not null default now(),
  notes                    text,
  tags                     text[]      not null default '{}',
  status                   text        not null default 'saved'
                             check (status in ('saved', 'converted', 'archived')),
  converted_application_id text
);

create table if not exists applications (
  id               text primary key,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  company_id       text        not null references companies(id) on delete cascade,
  position         text        not null,
  job_url          text,
  location         text,
  work_mode        text check (work_mode is null or work_mode in ('onsite', 'hybrid', 'remote')),
  employment_type  text,
  salary           jsonb       not null default '{"min":null,"max":null,"currency":"USD","period":"year"}'::jsonb,
  applied_at       date,
  deadline         date,
  -- Add your own stages here and in lib/constants.ts; the board, funnel and
  -- analytics all read from that one list.
  status           text        not null default 'wishlist'
                     check (status in (
                       'wishlist', 'preparing', 'applied', 'viewed', 'recruiter_contacted',
                       'screening', 'assessment', 'interview', 'final_round', 'offer',
                       'accepted', 'rejected', 'withdrawn', 'ghosted'
                     )),
  priority         text        not null default 'medium'
                     check (priority in ('low', 'medium', 'high', 'urgent')),
  source           text,
  contact_ids      text[]      not null default '{}',
  referral         boolean     not null default false,
  referred_by      text,
  notes            text,
  tags             text[]      not null default '{}',
  resume_id        text references resumes(id) on delete set null,
  cover_letter_id  text references cover_letters(id) on delete set null,
  document_ids     text[]      not null default '{}',
  next_action      text,
  next_action_date date,
  job_id           text references jobs(id) on delete set null,
  description      text,
  archived         boolean     not null default false
);

create table if not exists contacts (
  id                text primary key,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  name              text        not null,
  company_id        text references companies(id) on delete set null,
  position          text,
  email             text,
  linkedin          text,
  phone             text,
  relationship      text        not null default 'other'
                      check (relationship in (
                        'recruiter', 'hiring_manager', 'employee', 'referral',
                        'friend', 'alumni', 'other'
                      )),
  source            text,
  last_contacted_at date,
  next_follow_up_at date,
  notes             text,
  tags              text[]      not null default '{}',
  favorite          boolean     not null default false
);

create table if not exists interviews (
  id                      text primary key,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  application_id          text        not null references applications(id) on delete cascade,
  company_id              text        not null references companies(id) on delete cascade,
  position                text        not null,
  scheduled_at            timestamptz not null,
  duration_minutes        integer     not null default 45,
  type                    text        not null default 'recruiter_screen',
  interviewer_contact_ids text[]      not null default '{}',
  interviewer_names       text[]      not null default '{}',
  round                   integer     not null default 1,
  meeting_url             text,
  location                text,
  status                  text        not null default 'scheduled'
                            check (status in (
                              'scheduled', 'completed', 'rescheduled',
                              'cancelled', 'passed', 'failed'
                            )),
  notes                   text,
  feedback                text,
  rating                  integer check (rating is null or (rating >= 1 and rating <= 5)),
  -- Research, questions and attached stories. Embedded because it is always
  -- read and written with its interview and never queried across rows.
  prep                    jsonb       not null default '{}'::jsonb
);

create table if not exists tasks (
  id           text primary key,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  title        text        not null,
  description  text,
  due_date     date,
  priority     text        not null default 'medium'
                 check (priority in ('low', 'medium', 'high', 'urgent')),
  status       text        not null default 'todo'
                 check (status in ('todo', 'in_progress', 'completed')),
  related_type text,
  related_id   text,
  completed_at timestamptz,
  tags         text[]      not null default '{}'
);

create table if not exists follow_ups (
  id             text primary key,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  type           text        not null default 'application',
  contact_id     text references contacts(id) on delete set null,
  application_id text references applications(id) on delete cascade,
  interview_id   text references interviews(id) on delete set null,
  due_date       date        not null,
  channel        text        not null default 'email',
  subject        text,
  message        text,
  status         text        not null default 'pending'
                   check (status in ('pending', 'sent', 'replied', 'no_response')),
  sent_at        timestamptz,
  replied_at     timestamptz
);

create table if not exists documents (
  id              text primary key,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  name            text        not null,
  type            text        not null default 'other',
  url             text,
  file_name       text,
  mime_type       text,
  size_bytes      bigint,
  -- Set when the file lives in Supabase Storage rather than at an external URL.
  storage_path    text,
  application_ids text[]      not null default '{}',
  notes           text,
  tags            text[]      not null default '{}'
);

create table if not exists notes (
  id          text primary key,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  entity_type text        not null,
  entity_id   text        not null,
  body        text        not null default '',
  pinned      boolean     not null default false
);

create table if not exists activities (
  id          text primary key,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  type        text        not null,
  entity_type text        not null,
  entity_id   text        not null,
  title       text        not null,
  description text,
  meta        jsonb       not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists goals (
  id              text primary key,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  type            text        not null,
  label           text        not null default '',
  target          numeric     not null default 1,
  period          text        not null default 'week'
                    check (period in ('week', 'month', 'quarter', 'all_time')),
  unit            text,
  manual_progress numeric,
  notes           text,
  active          boolean     not null default true
);

create table if not exists tags (
  id         text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name       text        not null,
  tone       text        not null default 'neutral'
);

create table if not exists calendar_events (
  id           text primary key,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  title        text        not null,
  type         text        not null default 'custom',
  start_at     timestamptz not null,
  end_at       timestamptz,
  all_day      boolean     not null default false,
  related_type text,
  related_id   text,
  location     text,
  url          text,
  notes        text
);

create table if not exists star_stories (
  id               text primary key,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  title            text        not null,
  body             text        not null default '',
  -- The four STAR columns predate the free-form body. Kept so an existing
  -- workspace still reads; nothing writes them any more.
  situation        text        not null default '',
  task             text        not null default '',
  action           text        not null default '',
  result           text        not null default '',
  competencies     text[]      not null default '{}',
  tags             text[]      not null default '{}',
  duration_seconds integer,
  favorite         boolean     not null default false
);

create table if not exists profiles (
  id                       text primary key,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  name                     text        not null default 'You',
  email                    text,
  headline                 text,
  location                 text,
  avatar_url               text,
  target_role              text,
  target_salary            numeric,
  currency                 text        not null default 'USD',
  fit                      jsonb       not null default '{}'::jsonb,
  notifications            jsonb       not null default '{}'::jsonb,
  hidden_pipeline_statuses text[]      not null default '{}',
  week_starts_on           smallint    not null default 1 check (week_starts_on in (0, 1))
);

/* -------------------------------------------------------------------------- */
/* Deferred foreign keys                                                      */
/* -------------------------------------------------------------------------- */

-- Added after the fact because jobs and applications reference each other.
alter table jobs
  drop constraint if exists jobs_converted_application_id_fkey,
  add constraint jobs_converted_application_id_fkey
    foreign key (converted_application_id) references applications(id) on delete set null;

alter table cover_letters
  drop constraint if exists cover_letters_application_id_fkey,
  add constraint cover_letters_application_id_fkey
    foreign key (application_id) references applications(id) on delete set null;

/* -------------------------------------------------------------------------- */
/* Indexes                                                                    */
/* -------------------------------------------------------------------------- */

create index if not exists applications_company_id_idx     on applications (company_id);
create index if not exists applications_status_idx         on applications (status);
create index if not exists applications_applied_at_idx     on applications (applied_at desc);
create index if not exists applications_updated_at_idx     on applications (updated_at desc);
create index if not exists applications_next_action_idx    on applications (next_action_date)
  where next_action_date is not null;
create index if not exists applications_deadline_idx       on applications (deadline)
  where deadline is not null;

create index if not exists interviews_application_id_idx   on interviews (application_id);
create index if not exists interviews_scheduled_at_idx     on interviews (scheduled_at);
create index if not exists interviews_status_idx           on interviews (status);

create index if not exists tasks_due_date_idx              on tasks (due_date) where status <> 'completed';
create index if not exists tasks_related_idx               on tasks (related_type, related_id);

create index if not exists follow_ups_due_date_idx         on follow_ups (due_date) where status = 'pending';
create index if not exists follow_ups_application_id_idx   on follow_ups (application_id);
create index if not exists follow_ups_contact_id_idx       on follow_ups (contact_id);

create index if not exists contacts_company_id_idx         on contacts (company_id);
create index if not exists jobs_company_id_idx             on jobs (company_id) where status = 'saved';
create index if not exists activities_entity_idx           on activities (entity_type, entity_id);
create index if not exists activities_occurred_at_idx      on activities (occurred_at desc);
create index if not exists notes_entity_idx                on notes (entity_type, entity_id);
create index if not exists calendar_events_start_at_idx    on calendar_events (start_at);

/* -------------------------------------------------------------------------- */
/* updated_at triggers                                                        */
/* -------------------------------------------------------------------------- */

do $$
declare
  t text;
begin
  foreach t in array array[
    'companies', 'applications', 'jobs', 'contacts', 'interviews', 'tasks',
    'follow_ups', 'resumes', 'cover_letters', 'documents', 'notes', 'activities',
    'goals', 'tags', 'calendar_events', 'star_stories', 'profiles'
  ]
  loop
    execute format('drop trigger if exists %I on %I', t || '_touch_updated_at', t);
    execute format(
      'create trigger %I before update on %I for each row execute function applyos_touch_updated_at()',
      t || '_touch_updated_at', t
    );
  end loop;
end;
$$;

/* -------------------------------------------------------------------------- */
/* Row Level Security                                                         */
/* -------------------------------------------------------------------------- */

-- RLS is ON, with a permissive policy, because ApplyOS has no auth. Read the
-- security note at the top of this file before exposing an instance publicly.
do $$
declare
  t text;
begin
  foreach t in array array[
    'companies', 'applications', 'jobs', 'contacts', 'interviews', 'tasks',
    'follow_ups', 'resumes', 'cover_letters', 'documents', 'notes', 'activities',
    'goals', 'tags', 'calendar_events', 'star_stories', 'profiles'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_single_user', t);
    execute format(
      'create policy %I on %I for all using (true) with check (true)',
      t || '_single_user', t
    );
  end loop;
end;
$$;

-- ── Multi-user variant ───────────────────────────────────────────────────────
-- When you add Supabase Auth, run something like this for every table instead:
--
--   alter table applications add column user_id uuid not null
--     references auth.users(id) on delete cascade default auth.uid();
--   create index applications_user_id_idx on applications (user_id);
--   drop policy applications_single_user on applications;
--   create policy applications_owner on applications for all
--     using (auth.uid() = user_id) with check (auth.uid() = user_id);
