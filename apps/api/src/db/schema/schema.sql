-- Auth tables (Better Auth). No RLS — they are the identity store.
create table if not exists "user" (
  id text primary key,
  name text not null,
  email text not null unique,
  email_verified boolean not null default false,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  two_factor_enabled boolean default false,
  locale text not null default 'en-US'
);

create table if not exists session (
  id text primary key,
  expires_at timestamptz not null,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  user_id text not null references "user"(id) on delete cascade
);

create table if not exists account (
  id text primary key,
  issuer text not null,
  account_id text not null,
  provider_id text not null,
  user_id text not null references "user"(id) on delete cascade,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists verification (
  id text primary key,
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists two_factor (
  id text primary key,
  secret text not null,
  backup_codes text not null,
  user_id text not null references "user"(id) on delete cascade,
  verified boolean default true,
  failed_verification_count integer default 0,
  locked_until timestamptz
);

-- Domain tables. Every row is owned by a user.
-- Composite (id, user_id) uniques let child FKs bind parent ownership, not just id.
create table if not exists contact (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  company text,
  created_at timestamptz not null default now(),
  constraint contact_id_user_id_key unique (id, user_id)
);

create table if not exists project (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  name text not null,
  status text not null,
  position integer not null default 0,
  contact_id text,
  started_at date not null,
  ended_at date,
  deal_kind text not null,
  deal_amount_cents bigint not null default 0,
  deal_currency text not null default 'BRL',
  deal_installments integer,
  repo_full_name text,
  repo_url text,
  repo_workflow text,
  description text,
  comments jsonb not null default '[]',
  created_at timestamptz not null default now(),
  constraint project_id_user_id_key unique (id, user_id),
  constraint project_contact_user_fk
    foreign key (contact_id, user_id) references contact (id, user_id) on delete set null
);

create table if not exists project_tool (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  project_id text not null,
  catalog_id text not null,
  name text not null,
  category text not null,
  account text,
  amount_cents bigint,
  currency text,
  cycle text,
  next_invoice date,
  payer text,
  created_at timestamptz not null default now(),
  constraint project_tool_id_user_id_key unique (id, user_id),
  constraint project_tool_project_user_fk
    foreign key (project_id, user_id) references project (id, user_id) on delete cascade
);

create table if not exists credential (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  project_tool_id text not null,
  label text not null,
  ciphertext text not null,
  iv text not null,
  tag text not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  constraint credential_tool_user_fk
    foreign key (project_tool_id, user_id) references project_tool (id, user_id) on delete cascade
);

create table if not exists invoice (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  project_id text not null,
  amount_cents bigint not null,
  currency text not null,
  status text not null,
  due_date date not null,
  paid_at timestamptz,
  payment_method text,
  reference_month text,
  payer_name text not null default '',
  has_attachment boolean not null default false,
  created_at timestamptz not null default now(),
  constraint invoice_id_user_id_key unique (id, user_id),
  constraint invoice_project_user_fk
    foreign key (project_id, user_id) references project (id, user_id) on delete cascade
);

create table if not exists payment (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  invoice_id text not null,
  amount_cents bigint not null,
  paid_at timestamptz not null,
  method text not null,
  constraint payment_invoice_user_fk
    foreign key (invoice_id, user_id) references invoice (id, user_id) on delete cascade
);

create table if not exists custom_tool (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  name text not null,
  category text not null,
  unique (user_id, name)
);

create table if not exists user_key (
  user_id text primary key references "user"(id) on delete cascade,
  wrapped_dek text not null,
  iv text not null,
  tag text not null,
  master_key_version integer not null default 1
);

-- One GitHub personal access token per user, sealed with the same envelope as
-- credential. The token never leaves the server.
create table if not exists github_token (
  user_id text primary key references "user"(id) on delete cascade,
  login text,
  ciphertext text not null,
  iv text not null,
  tag text not null,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

alter table github_token drop column if exists hook_secret;
alter table github_token drop column if exists hook_id;

create table if not exists audit_log (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  module text not null,
  action text not null,
  subject_id text,
  subject_label text,
  project_id text,
  changes jsonb not null default '[]',
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists contact_user_created_idx on contact (user_id, created_at desc);
create index if not exists project_user_created_idx on project (user_id, created_at desc);
create index if not exists project_tool_user_project_idx on project_tool (user_id, project_id);
create index if not exists invoice_user_project_idx on invoice (user_id, project_id);
create index if not exists payment_user_invoice_idx on payment (user_id, invoice_id);
create index if not exists credential_user_tool_idx on credential (user_id, project_tool_id);
create index if not exists audit_log_user_created_idx on audit_log (user_id, created_at desc);

-- Existing DBs were created with single-column FKs and GRANT ALL.
-- CREATE TABLE IF NOT EXISTS will not reshape them; this tail is idempotent.

-- Better Auth 1.7 scopes accounts by (issuer, account_id). Credential rows
-- use local:credential and the linked user's id.
alter table account add column if not exists issuer text;
update account
  set issuer = 'local:credential',
      account_id = user_id
  where provider_id = 'credential' and (issuer is null or issuer = '');
update account
  set issuer = 'local:oauth:' || provider_id
  where issuer is null or issuer = '';
alter table account alter column issuer set not null;
create unique index if not exists "account_issuer_accountId_uidx" on account (issuer, account_id);

-- Email OTP is now the only second factor and sign-in requires a confirmed
-- address. Accounts that predate both are grandfathered in, once: the create
-- table above already has locale, so a fresh database raises duplicate_column
-- here and never touches rows Better Auth just wrote.
alter table "user" add column if not exists two_factor_enabled boolean default false;
do $$ begin
  alter table "user" add column locale text not null default 'en-US';
  update "user" set email_verified = true, two_factor_enabled = true;
exception when duplicate_column then null;
end $$;
do $$ begin
  alter table contact add constraint contact_id_user_id_key unique (id, user_id);
exception when duplicate_object or duplicate_table then null;
end $$;
do $$ begin
  alter table project add constraint project_id_user_id_key unique (id, user_id);
exception when duplicate_object or duplicate_table then null;
end $$;
do $$ begin
  alter table project_tool add constraint project_tool_id_user_id_key unique (id, user_id);
exception when duplicate_object or duplicate_table then null;
end $$;
do $$ begin
  alter table invoice add constraint invoice_id_user_id_key unique (id, user_id);
exception when duplicate_object or duplicate_table then null;
end $$;

alter table project drop constraint if exists project_contact_id_fkey;
do $$ begin
  alter table project add constraint project_contact_user_fk
    foreign key (contact_id, user_id) references contact (id, user_id) on delete set null;
exception when duplicate_object or duplicate_table then null;
end $$;

alter table project_tool drop constraint if exists project_tool_project_id_fkey;
do $$ begin
  alter table project_tool add constraint project_tool_project_user_fk
    foreign key (project_id, user_id) references project (id, user_id) on delete cascade;
exception when duplicate_object or duplicate_table then null;
end $$;

alter table credential drop constraint if exists credential_project_tool_id_fkey;
do $$ begin
  alter table credential add constraint credential_tool_user_fk
    foreign key (project_tool_id, user_id) references project_tool (id, user_id) on delete cascade;
exception when duplicate_object or duplicate_table then null;
end $$;

alter table invoice drop constraint if exists invoice_project_id_fkey;
do $$ begin
  alter table invoice add constraint invoice_project_user_fk
    foreign key (project_id, user_id) references project (id, user_id) on delete cascade;
exception when duplicate_object or duplicate_table then null;
end $$;

alter table payment drop constraint if exists payment_invoice_id_fkey;
do $$ begin
  alter table payment add constraint payment_invoice_user_fk
    foreign key (invoice_id, user_id) references invoice (id, user_id) on delete cascade;
exception when duplicate_object or duplicate_table then null;
end $$;

-- Runtime role cannot bypass RLS. Superuser still can; withUser() SET ROLE here.
do $$ begin
  create role app_runtime nosuperuser nobypassrls;
exception when duplicate_object or insufficient_privilege then null;
end $$;

do $$ begin
  execute format('grant app_runtime to %I', current_user);
exception when others then null;
end $$;

-- Creating and granting the role above needs CREATEROLE, which the runtime
-- user may not have. Both failures are swallowed, so assert the outcome here:
-- without this the API boots fine and every withUser() query dies on SET ROLE.
do $$ begin
  if to_regrole('app_runtime') is null then
    raise exception 'role app_runtime is missing'
      using hint =
        'Run as a superuser: create role app_runtime nosuperuser nobypassrls; grant app_runtime to '
        || quote_ident(current_user) || ';';
  end if;
  if not pg_has_role(current_user, 'app_runtime', 'member') then
    raise exception 'role app_runtime exists but % is not a member of it', current_user
      using hint =
        'Run as a superuser: grant app_runtime to ' || quote_ident(current_user) || ';';
  end if;
end $$;

do $$ begin
  execute 'revoke all on all tables in schema public from app_runtime';
  execute 'alter default privileges in schema public revoke select, insert, update, delete on tables from app_runtime';
  execute 'grant usage on schema public to app_runtime';
  execute 'grant select, insert, update, delete on contact, project, project_tool, credential, invoice, payment, custom_tool, user_key, github_token to app_runtime';
  execute 'grant select, insert on audit_log to app_runtime';
  execute 'grant usage, select on all sequences in schema public to app_runtime';
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'contact','project','project_tool','credential','invoice','payment',
    'custom_tool','user_key','audit_log','github_token'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_isolation on %I', t);
    execute format(
      'create policy tenant_isolation on %I
         using (user_id = nullif(current_setting(''app.user_id'', true), ''''))
         with check (user_id = nullif(current_setting(''app.user_id'', true), ''''))',
      t
    );
  end loop;
end $$;

-- Audit log: extra columns, append-only grants, drop client-side project history.
alter table audit_log add column if not exists module text;
alter table audit_log add column if not exists subject_label text;
alter table audit_log add column if not exists project_id text;
alter table audit_log add column if not exists changes jsonb not null default '[]';
update audit_log set module = 'security' where module is null;
update audit_log set module = 'settings' where module = 'contact';
update audit_log set module = 'settings' where module = 'tools' and action like 'tools.custom.%';
update audit_log set module = 'project' where module in ('financial', 'tools');
alter table audit_log alter column module set not null;
alter table project drop column if exists history;

create index if not exists audit_log_user_module_idx on audit_log (user_id, module, created_at desc);
create index if not exists audit_log_user_project_idx on audit_log (user_id, project_id, created_at desc);
