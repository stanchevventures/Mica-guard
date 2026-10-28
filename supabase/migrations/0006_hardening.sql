-- =====================================================================
-- MiCA-Guard — миграция 0006: укрепване преди публикуване
--
-- 1. Лимит от 3 организации, създадени от един потребител.
--    Без него всеки може да създава нови организации и да получава
--    нови 10 безплатни проверки на месец за всяка.
-- 2. Замяната на регистъра на ESMA се изпълнява по една наведнъж.
--    Vercel Cron може по изключение да извика задачата два пъти
--    едновременно — без заключване записите биха се удвоили.
--
-- Изисква 0001–0005. Може да се пуска повторно.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Лимит на организациите
-- ---------------------------------------------------------------------
create or replace function public.enforce_org_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  -- Скриптове със secret ключа (без потребител) не се ограничават
  if auth.uid() is null then
    return new;
  end if;

  select count(*) into v_count
  from public.organizations
  where created_by = auth.uid();

  if v_count >= 3 then
    raise exception 'Достигнат е лимитът от 3 организации на потребител.'
      using errcode = 'MG001';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_org_limit() from public, anon, authenticated;

drop trigger if exists trg_enforce_org_limit on public.organizations;
create trigger trg_enforce_org_limit
  before insert on public.organizations
  for each row execute function public.enforce_org_limit();

-- ---------------------------------------------------------------------
-- 2. Замяна на регистър — с изключващо заключване за всеки регистър
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

  -- Втора едновременна замяна на същия регистър изчаква първата
  perform pg_advisory_xact_lock(hashtext('mica-guard:esma:' || p_register));

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
-- 3. Импорти, останали „running“ (прекъсната задача), се маркират като неуспешни
-- ---------------------------------------------------------------------
update public.esma_register_imports
set status = 'failed', finished_at = now(), error = coalesce(error, 'прекъснат импорт')
where status = 'running' and started_at < now() - interval '1 hour';
