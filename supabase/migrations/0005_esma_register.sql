-- =====================================================================
-- MiCA-Guard — миграция 0005: регистър на ESMA по MiCA
--
-- Копие на временния регистър на ESMA (CSV файлове): доставчици на услуги
-- (лиценз по чл. 63 / нотификация по чл. 60), емитенти на EMT и ART с
-- техните бели книги, списък на субекти без лиценз.
--
-- Данните се зареждат със скрипта scripts/esma-sync.mts (secret ключ).
-- Потребителите само четат — регистърът е публична информация.
--
-- Изисква 0001–0004. Може да се пуска повторно.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Лог на импортите
-- ---------------------------------------------------------------------
create table if not exists public.esma_register_imports (
  id          uuid primary key default gen_random_uuid(),
  trigger     text not null default 'script' check (trigger in ('script', 'cron')),
  status      text not null default 'running' check (status in ('running', 'succeeded', 'partial', 'failed')),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  files       jsonb not null default '[]'::jsonb,
  error       text
);

comment on table public.esma_register_imports is 'Лог на синхронизациите с регистъра на ESMA по MiCA';

-- ---------------------------------------------------------------------
-- 2. Състояние на всеки регистър (кога е обновен успешно за последно)
-- ---------------------------------------------------------------------
create table if not exists public.esma_register_status (
  register        text primary key check (register in ('casp', 'emt', 'art', 'ncasp')),
  rows            integer not null default 0 check (rows >= 0),
  sha256          text,
  source_url      text not null,
  last_import_id  uuid references public.esma_register_imports (id) on delete set null,
  last_success_at timestamptz not null default now()
);

comment on table public.esma_register_status is 'Последно успешно обновяване на всеки регистър на ESMA';

-- ---------------------------------------------------------------------
-- 3. Записите
-- ---------------------------------------------------------------------
create table if not exists public.esma_register_entries (
  id                     bigint generated always as identity primary key,
  register               text not null check (register in ('casp', 'emt', 'art', 'ncasp')),
  lei                    char(20) check (lei ~ '^[A-Z0-9]{18}[0-9]{2}$'),
  lei_name               text,
  commercial_name        text,
  home_member_state      char(2),
  competent_authority    text,
  website                text,
  legal_basis            text check (legal_basis in ('art63', 'art60')),
  services               text[] not null default '{}',
  issuer_authorisation   text check (issuer_authorisation in ('credit_institution', 'emi', 'art_issuer')),
  authorisation_date     date,
  authorisation_end_date date,
  whitepaper_url         text,
  whitepaper_date        date,
  last_update            date,
  details                jsonb not null default '{}'::jsonb,
  import_id              uuid references public.esma_register_imports (id) on delete set null
);

create index if not exists esma_register_entries_lei_idx on public.esma_register_entries (register, lei);
create index if not exists esma_register_entries_name_idx on public.esma_register_entries (register, lower(lei_name));

comment on table public.esma_register_entries is 'Копие на временния регистър на ESMA по MiCA (CASPS, EMTWP, ARTZZ, NCASP)';
comment on column public.esma_register_entries.details is 'Оригиналният ред от CSV файла на ESMA';

-- ---------------------------------------------------------------------
-- 4. Права: всички влезли потребители четат; пише само service_role
-- ---------------------------------------------------------------------
alter table public.esma_register_imports enable row level security;
alter table public.esma_register_status  enable row level security;
alter table public.esma_register_entries enable row level security;

revoke all on public.esma_register_imports, public.esma_register_status, public.esma_register_entries from anon, authenticated;
grant select on public.esma_register_status, public.esma_register_entries to authenticated;
grant select (id, status, started_at, finished_at) on public.esma_register_imports to authenticated;

drop policy if exists esma_entries_read on public.esma_register_entries;
create policy esma_entries_read on public.esma_register_entries for select to authenticated using (true);

drop policy if exists esma_status_read on public.esma_register_status;
create policy esma_status_read on public.esma_register_status for select to authenticated using (true);

drop policy if exists esma_imports_read on public.esma_register_imports;
create policy esma_imports_read on public.esma_register_imports for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- 5. Атомарна замяна на един регистър
--    Всичко или нищо: ако нещо се провали, старите данни остават.
-- ---------------------------------------------------------------------
create or replace function public.esma_replace_register(
  p_import     uuid,
  p_register   text,
  p_source_url text,
  p_sha256     text,
  p_rows       jsonb
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_register not in ('casp', 'emt', 'art', 'ncasp') then
    raise exception 'Непознат регистър: %', p_register;
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows трябва да е масив';
  end if;

  delete from public.esma_register_entries where register = p_register;

  insert into public.esma_register_entries (
    register, lei, lei_name, commercial_name, home_member_state, competent_authority, website,
    legal_basis, services, issuer_authorisation, authorisation_date, authorisation_end_date,
    whitepaper_url, whitepaper_date, last_update, details, import_id
  )
  select
    p_register,
    r.lei, r.lei_name, r.commercial_name, upper(r.home_member_state), r.competent_authority, r.website,
    r.legal_basis, coalesce(r.services, '{}'), r.issuer_authorisation, r.authorisation_date, r.authorisation_end_date,
    r.whitepaper_url, r.whitepaper_date, r.last_update, coalesce(r.details, '{}'::jsonb), p_import
  from jsonb_to_recordset(p_rows) as r(
    lei text, lei_name text, commercial_name text, home_member_state text, competent_authority text, website text,
    legal_basis text, services text[], issuer_authorisation text, authorisation_date date, authorisation_end_date date,
    whitepaper_url text, whitepaper_date date, last_update date, details jsonb
  );
  get diagnostics v_count = row_count;

  insert into public.esma_register_status (register, rows, sha256, source_url, last_import_id, last_success_at)
  values (p_register, v_count, p_sha256, p_source_url, p_import, now())
  on conflict (register) do update
    set rows = excluded.rows,
        sha256 = excluded.sha256,
        source_url = excluded.source_url,
        last_import_id = excluded.last_import_id,
        last_success_at = excluded.last_success_at;

  return v_count;
end;
$$;

revoke execute on function public.esma_replace_register(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.esma_replace_register(uuid, text, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------
-- 6. Правилата v1.2: двигателят ползва регистъра като източник
-- ---------------------------------------------------------------------
update public.rule_sets set is_active = false where is_active and version <> 'mica-2026.10-v1.2';

insert into public.rule_sets (version, description, is_active, rules)
values (
  'mica-2026.10-v1.2',
  'v1.1 + проверка в регистъра на ESMA: лиценз/нотификация и услуги на доставчика (по LEI), лиценз и бяла книга на емитента на EMT/ART (по LEI на емитента)',
  true,
  '["CLS-001","CLS-002","AUTH-001","AUTH-002","AUTH-003","EMT-001","EMT-002","EMT-003","EMT-004","EMT-005","ART-001","ART-002","ART-003","ART-004","ART-005","STB-001","ISS-001","WP-000","WP-OFR","WP-OFR-N","WP-OFR-X","WP-001","WP-002","WP-054","WP-143","LNK-001","SUIT-001","ANON-001","SIG-001"]'::jsonb
)
on conflict (version) do update
  set description = excluded.description, is_active = true, rules = excluded.rules;
