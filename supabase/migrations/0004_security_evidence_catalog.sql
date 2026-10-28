-- =====================================================================
-- MiCA-Guard — 0004: сигурност, модел на доказателствата, каталог
--
-- Пусни веднъж в Supabase -> SQL Editor. Безопасно е повторно пускане.
-- Включва и набора правила v1.1 (не е нужно да пускаш 0003 преди това).
-- =====================================================================

-- =====================================================================
-- 0. НОВИ ВИДОВЕ СУБЕКТИ ПО ЧЛ. 60 (ДЦК, управляващи дружества/ЛУАИФ, пазарни оператори)
--    Новите стойности не се използват в този скрипт (изискване на PostgreSQL).
-- =====================================================================
alter type public.entity_type add value if not exists 'csd';
alter type public.entity_type add value if not exists 'fund_manager';
alter type public.entity_type add value if not exists 'market_operator';

-- =====================================================================
-- A. СИГУРНОСТ
-- =====================================================================

-- A1. Одитният лог блокираше изтриването на организации и акаунти:
--     външните ключове с "on delete set null" правят UPDATE върху
--     лога, а той е само за добавяне. Махаме ключовете — записите
--     остават непроменени, идентификаторите се пазят като история.
alter table public.audit_log drop constraint if exists audit_log_organization_id_fkey;
alter table public.audit_log drop constraint if exists audit_log_actor_id_fkey;

-- A2. Одитният запис за нова проверка винаги има автор
create or replace function public.log_check_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id, payload)
    values (new.organization_id, coalesce(auth.uid(), new.requested_by), 'check.created',
            'compliance_check', new.id::text, jsonb_build_object('asset_id', new.asset_id));
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id, payload)
    values (new.organization_id, auth.uid(), 'check.status_changed', 'compliance_check', new.id::text,
            jsonb_build_object('from', old.status, 'to', new.status, 'result', new.result));
  end if;
  return new;
end;
$$;

-- A3. Профил: потребителят може да променя само име, аватар, език и длъжност.
--     (Преди можеше да смени имейла си — представяне за друг и блокиране
--     на чужда регистрация с този имейл.)
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url, locale, job_title) on public.profiles to authenticated;

-- Имейлът в профила следва имейла в auth.users
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is not null and new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- A4. Организация: планът и квотата не могат да се задават от потребителя
--     и при създаване (преди можеше да си даде Enterprise и неограничена квота).
revoke insert on public.organizations from authenticated;
grant insert (name, slug, entity_type, country_code, lei, nca_name, casp_license_number, created_by)
  on public.organizations to authenticated;

-- A5. Проверка: потребителят задава само входа; резултатът се пише от сървъра
revoke insert on public.compliance_checks from authenticated;
grant insert (organization_id, asset_id, requested_by, rule_set_id, input_snapshot)
  on public.compliance_checks to authenticated;

-- A6. Членства: само собственик управлява ролята owner;
--     организацията винаги има поне един собственик.
create or replace function public.protect_org_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid;
  v_actor_is_owner boolean := false;
  v_owner_count integer;
begin
  if tg_op = 'INSERT' then
    v_org := new.organization_id;
  else
    v_org := old.organization_id;
  end if;

  -- Каскадно изтриване на цялата организация: без ограничения
  if tg_op = 'DELETE' and not exists (select 1 from public.organizations where id = v_org) then
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.organization_id <> old.organization_id or new.user_id <> old.user_id then
      raise exception 'Членството не може да се премести към друга организация или потребител'
        using errcode = '42501';
    end if;
  end if;

  -- Ограничения за заявки от потребители (сървърът със service ключ няма auth.uid())
  if v_actor is not null then
    select exists (
      select 1 from public.organization_members
      where organization_id = v_org and user_id = v_actor and role = 'owner'
    ) into v_actor_is_owner;

    if not v_actor_is_owner then
      if tg_op = 'INSERT' then
        -- Изключение: първият член на нова организация (създава се автоматично)
        if new.role = 'owner'
           and exists (select 1 from public.organization_members where organization_id = v_org) then
          raise exception 'Само собственик може да дава ролята „собственик“' using errcode = '42501';
        end if;
      elsif tg_op = 'UPDATE' then
        if new.role = 'owner' or old.role = 'owner' then
          raise exception 'Само собственик може да дава или променя ролята „собственик“' using errcode = '42501';
        end if;
      else
        if old.role = 'owner' then
          raise exception 'Само собственик може да премахне собственик' using errcode = '42501';
        end if;
      end if;
    end if;
  end if;

  -- Поне един собственик
  if tg_op = 'DELETE' then
    if old.role = 'owner' then
      select count(*) into v_owner_count
      from public.organization_members
      where organization_id = old.organization_id and role = 'owner';
      if v_owner_count <= 1 then
        raise exception 'Организацията трябва да има поне един собственик. Първо прехвърли собствеността или изтрий организацията.'
          using errcode = '23514';
      end if;
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.role = 'owner' and new.role <> 'owner' then
      select count(*) into v_owner_count
      from public.organization_members
      where organization_id = old.organization_id and role = 'owner';
      if v_owner_count <= 1 then
        raise exception 'Организацията трябва да има поне един собственик. Първо прехвърли собствеността.'
          using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_org_membership on public.organization_members;
create trigger trg_protect_org_membership
  before insert or update or delete on public.organization_members
  for each row execute function public.protect_org_membership();

-- A7. Броячът на проверките е само за вътрешна употреба (квотата).
--     Преди всеки (и анонимен) можеше да види броя проверки на чужда организация.
revoke execute on function public.checks_used_this_month(uuid) from public, anon, authenticated;

-- =====================================================================
-- B. МОДЕЛ НА ДОКАЗАТЕЛСТВАТА: нарушение ≠ липсващи данни
-- =====================================================================
alter table public.check_findings add column if not exists outcome text;

-- Старите констатации запазват смисъла си: изпълнено / неизпълнено
update public.check_findings
set outcome = case when passed then 'pass' else 'fail' end
where outcome is null;

alter table public.check_findings alter column outcome set not null;

alter table public.check_findings drop constraint if exists check_findings_outcome_check;
alter table public.check_findings add constraint check_findings_outcome_check
  check (outcome in ('pass', 'fail', 'evidence_required', 'upcoming', 'not_applicable'));

alter table public.check_findings drop constraint if exists check_findings_passed_consistent;
alter table public.check_findings add constraint check_findings_passed_consistent
  check (passed = (outcome in ('pass', 'not_applicable')));

create index if not exists idx_findings_outcome on public.check_findings (check_id, outcome);

-- =====================================================================
-- C. КАТАЛОГ: структурирани данни за правилата
-- =====================================================================
alter table public.crypto_assets add column if not exists identifiable_issuer boolean;
alter table public.crypto_assets add column if not exists issuer_authorisation text;
alter table public.crypto_assets add column if not exists anonymisation_function boolean not null default false;

alter table public.crypto_assets drop constraint if exists crypto_assets_issuer_authorisation_check;
alter table public.crypto_assets add constraint crypto_assets_issuer_authorisation_check
  check (issuer_authorisation is null
         or issuer_authorisation in ('credit_institution', 'emi', 'art_issuer', 'none'));

comment on column public.crypto_assets.identifiable_issuer is
  'true/false — установено; null — изисква преценка (съображение 22; ESMA Q&A 2552)';
comment on column public.crypto_assets.issuer_authorisation is
  'ART/EMT: лиценз на емитента; none = известно е, че няма лиценз в ЕС';
comment on column public.crypto_assets.anonymisation_function is
  'Вградена функция за анонимизиране (чл. 76(3))';

-- Bitcoin — без идентифицируем емитент (оценка на MiCA-Guard; Q&A 2552 не посочва конкретни активи)
update public.crypto_assets
set identifiable_issuer = false,
    metadata = metadata || jsonb_build_object(
      'issuer_note', 'Оценка на MiCA-Guard: без идентифицируем емитент (съображение 22). ESMA Q&A 2552 не посочва конкретни активи.')
where blockchain = 'bitcoin' and upper(symbol) = 'BTC' and contract_address is null;

-- Ethereum — изисква документирана преценка от платформата
update public.crypto_assets
set identifiable_issuer = null,
    metadata = metadata || jsonb_build_object(
      'issuer_note', 'Изисква документирана преценка дали има идентифицируем емитент')
where blockchain = 'ethereum' and upper(symbol) = 'ETH' and contract_address is null;

-- USDC — EMT, емитент: институция за електронни пари (ACPR, Франция)
-- whitepaper_notified_at = дата на бялата книга в регистъра на ESMA (първоначална версия).
-- Източници: регистър на ESMA (по casptracker.eu, проверено на 26.10.2026); бяла книга на Circle.
update public.crypto_assets
set identifiable_issuer = true,
    issuer_name = 'Circle Internet Financial Europe SAS',
    issuer_lei = '969500OYUDADGZKCR583',
    issuer_authorisation = 'emi',
    whitepaper_url = 'https://www.circle.com/legal/mica-usdc-whitepaper',
    whitepaper_notified_at = '2024-07-01',
    metadata = (metadata - 'whitepaper_first_published') || jsonb_build_object(
      'reference_currency', 'USD',
      'issuer_competent_authority', 'ACPR',
      'issuer_home_member_state', 'FR',
      'whitepaper_last_amended', '2026-09-15',
      'whitepaper_source', 'Регистър на ESMA (по casptracker.eu, проверено на 26.10.2026); бяла книга на Circle',
      'data_retrieved_at', '2026-10-27')
where blockchain = 'ethereum'
  and lower(contract_address) = lower('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');

-- EURC — EMT, същият емитент
update public.crypto_assets
set identifiable_issuer = true,
    issuer_name = 'Circle Internet Financial Europe SAS',
    issuer_lei = '969500OYUDADGZKCR583',
    issuer_authorisation = 'emi',
    whitepaper_url = 'https://www.circle.com/legal/mica-eurc-whitepaper',
    whitepaper_notified_at = '2024-07-01',
    metadata = (metadata - 'whitepaper_first_published') || jsonb_build_object(
      'reference_currency', 'EUR',
      'issuer_competent_authority', 'ACPR',
      'issuer_home_member_state', 'FR',
      'whitepaper_last_amended', '2025-12-24',
      'whitepaper_source', 'Регистър на ESMA (по casptracker.eu, проверено на 26.10.2026); бяла книга на Circle',
      'data_retrieved_at', '2026-10-27')
where blockchain = 'ethereum'
  and lower(contract_address) = lower('0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c');

-- Monero — вградена функция за анонимизиране (чл. 76(3))
insert into public.crypto_assets
  (symbol, name, blockchain, mica_classification, identifiable_issuer, anonymisation_function, metadata)
values
  ('XMR', 'Monero', 'monero', 'other_crypto_asset', false, true,
   jsonb_build_object('anonymisation_note',
     'Поверителност по подразбиране (ring signatures, stealth addresses, RingCT)'))
on conflict do nothing;

-- Tether USD — EMT, чийто емитент няма лиценз в ЕС.
-- Източници: не фигурира в регистъра на ESMA и няма нотифицирана бяла книга по MiCA
-- (casptracker.eu, проверено на 26.10.2026); емитентът е заявил, че няма да кандидатства
-- (публикации в пресата от 07.2026). Становището на ESMA от 08.10.2026 не посочва конкретни токени.
insert into public.crypto_assets
  (symbol, name, blockchain, contract_address, issuer_name, mica_classification,
   identifiable_issuer, issuer_authorisation, metadata)
values
  ('USDT', 'Tether USD', 'ethereum', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 'Tether', 'emt',
   true, 'none', '{}'::jsonb)
on conflict do nothing;

update public.crypto_assets
set issuer_authorisation = 'none',
    metadata = (metadata - 'compliance_note') || jsonb_build_object(
      'reference_currency', 'USD',
      'compliance_note', 'Не фигурира в регистъра на ESMA; няма нотифицирана бяла книга по MiCA (casptracker.eu, 26.10.2026). Емитентът е заявил, че няма да кандидатства за лиценз (публикации от 07.2026).',
      'data_retrieved_at', '2026-10-27')
where blockchain = 'ethereum'
  and lower(contract_address) = lower('0xdAC17F958D2ee523a2206206994597C13D831ec7');

-- =====================================================================
-- D. ИСТОРИЯ НА ПРОВЕРКИТЕ: броят нарушения и липсващи данни отделно
-- =====================================================================
create or replace view public.v_check_history
with (security_invoker = true)
as
select
  c.id,
  c.organization_id,
  c.created_at,
  c.completed_at,
  c.status,
  c.result,
  c.risk_score,
  c.classification_result,
  a.symbol,
  a.name          as asset_name,
  a.blockchain,
  p.full_name     as requested_by_name,
  r.version       as rule_set_version,
  count(f.id) filter (where f.outcome = 'fail')                                          as failed_findings,
  count(f.id) filter (where f.outcome = 'fail' and f.severity in ('high', 'critical'))   as critical_findings,
  count(f.id) filter (where f.outcome = 'evidence_required')                             as evidence_gaps,
  count(f.id) filter (where f.outcome = 'upcoming')                                      as upcoming_obligations,
  c.input_snapshot -> 'answers' -> 'activities'                                          as activities
from public.compliance_checks c
join public.crypto_assets a   on a.id = c.asset_id
left join public.profiles p   on p.id = c.requested_by
left join public.rule_sets r  on r.id = c.rule_set_id
left join public.check_findings f on f.check_id = c.id
group by c.id, a.id, p.id, r.id;

-- =====================================================================
-- E. НАБОР ПРАВИЛА v1.1
-- =====================================================================
update public.rule_sets
set is_active = false
where version <> 'mica-2026.10-v1.1' and is_active;

insert into public.rule_sets (version, description, is_active, rules)
values (
  'mica-2026.10-v1.1',
  'Оценка по услуги (чл. 3(1), т. 16); изходи: изпълнено / нарушение / нужни данни / предстои / информация. Включва ESMA Q&A 2404, 2552, 2654 и становище ESMA75-113276571-1742 (08.10.2026). Описание: docs/RULES.md. Не е правно становище.',
  true,
  '["CLS-001","CLS-002","AUTH-001","AUTH-002","EMT-001","EMT-002","EMT-003","EMT-004","EMT-005","ART-001","ART-002","ART-003","ART-004","ART-005","STB-001","ISS-001","WP-000","WP-OFR","WP-OFR-N","WP-OFR-X","WP-001","WP-002","WP-054","WP-143","LNK-001","SUIT-001","ANON-001","SIG-001"]'::jsonb
)
on conflict (version) do update
  set is_active = true, description = excluded.description, rules = excluded.rules;
