-- =====================================================================
-- MiCA-Guard v1.5
--   A. Регистърът на ESMA се чете и без вход (публичният стейбълкойн чекър)
--   B. Каталогът се разширява със стейбълкойни и основни монети (проверка на портфейл)
--   C. Един LEI може да стои в няколко организации
-- Пусни веднъж в Supabase -> SQL Editor. Безопасно е да се пусне повторно.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A. Публично четене на копието на регистъра
--    Това са публични данни на ESMA. Таблицата с импортите остава само за влезли.
-- ---------------------------------------------------------------------
grant select on public.esma_register_status, public.esma_register_entries to anon;

drop policy if exists esma_entries_read on public.esma_register_entries;
create policy esma_entries_read on public.esma_register_entries
  for select to anon, authenticated using (true);

drop policy if exists esma_status_read on public.esma_register_status;
create policy esma_status_read on public.esma_register_status
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- B. Каталог
--    Стейбълкойните се издават на много вериги. Записваме ги веднъж с
--    blockchain = 'multichain' (без адрес на договор) — проверката по MiCA
--    зависи от емитента и бялата книга, не от веригата.
--    Данните за емитентите: регистър на ESMA (EMTWP.csv) към 22.10.2026.
--    При проверка лицензът се сверява наново с актуалния регистър по LEI.
-- ---------------------------------------------------------------------
insert into public.crypto_assets
  (symbol, name, blockchain, issuer_name, issuer_lei, mica_classification, identifiable_issuer,
   issuer_authorisation, whitepaper_url, whitepaper_notified_at, metadata)
values
  ('USDG',  'Global Dollar',    'multichain', 'Paxos Issuance Europe Oy', '743700KYSSTKZYGEUF50', 'emt', true, 'emi',
   'https://www.paxos.com/terms-and-conditions/usdg-eu-whitepaper', '2025-12-19',
   '{"reference_currency": "USD", "issuer_home_member_state": "FI", "issuer_competent_authority": "FIN-FSA", "data_retrieved_at": "2026-10-22"}'),
  ('EUROe', 'EUROe',            'multichain', 'Paxos Issuance Europe Oy', '743700KYSSTKZYGEUF50', 'emt', true, 'emi',
   'https://www.membrane.fi/whitepapers/EUROe.html', '2024-06-29',
   '{"reference_currency": "EUR", "issuer_home_member_state": "FI", "issuer_competent_authority": "FIN-FSA", "data_retrieved_at": "2026-10-22"}'),
  ('EURCV', 'EUR CoinVertible', 'multichain', 'Société Générale - Forge', '969500FX8K40ZDW4F377', 'emt', true, 'emi',
   'https://www.sgforge.com/wp-content/uploads/2025/10/EURCV-WP-Ethereum-Solana_XRPL_Stellar_2025.10.14.pdf', '2024-07-01',
   '{"reference_currency": "EUR", "issuer_home_member_state": "FR", "issuer_competent_authority": "ACPR", "data_retrieved_at": "2026-10-22"}'),
  ('USDCV', 'USD CoinVertible', 'multichain', 'Société Générale - Forge', '969500FX8K40ZDW4F377', 'emt', true, 'emi',
   'https://www.sgforge.com/wp-content/uploads/2025/08/SG-Forge-USDCV-White-Paper_V2.0_Ethereum_Solana_11082025.pdf', '2024-07-16',
   '{"reference_currency": "USD", "issuer_home_member_state": "FR", "issuer_competent_authority": "ACPR", "data_retrieved_at": "2026-10-22"}'),
  ('EURe',  'Monerium EUR',     'multichain', 'Monerium ehf', '2549003QDNZWASSSCY31', 'emt', true, 'emi',
   'https://monerium.com/assets/whitepapers/eure/EURe-WP-static.xhtml', '2026-01-09',
   '{"reference_currency": "EUR", "issuer_home_member_state": "IS", "issuer_competent_authority": "Central Bank of Iceland", "data_retrieved_at": "2026-10-22"}'),
  ('EURQ',  'Quantoz EURQ',     'multichain', 'Quantoz Payments B.V', '7245008P1HPUPVM7XL94', 'emt', true, 'emi',
   'https://www.quantoz.com/resources', '2025-03-24',
   '{"reference_currency": "EUR", "issuer_home_member_state": "NL", "issuer_competent_authority": "DNB", "data_retrieved_at": "2026-10-22"}'),
  ('USDQ',  'Quantoz USDQ',     'multichain', 'Quantoz Payments B.V', '7245008P1HPUPVM7XL94', 'emt', true, 'emi',
   'https://www.quantoz.com/resources', '2025-03-24',
   '{"reference_currency": "USD", "issuer_home_member_state": "NL", "issuer_competent_authority": "DNB", "data_retrieved_at": "2026-10-22"}'),
  ('EURI',  'Eurite',           'multichain', 'Banking Circle S.A.', '213800W1NGBLERUS6M39', 'emt', true, 'credit_institution',
   'https://www.eurite.com/download-whitepaper/', '2024-08-28',
   '{"reference_currency": "EUR", "issuer_home_member_state": "LU", "issuer_competent_authority": "CSSF", "data_retrieved_at": "2026-10-22"}'),
  ('EUROP', 'EUROP',            'multichain', 'SALVUS', '969500SGAEBRXYUAJ739', 'emt', true, 'emi',
   'https://schuman.io/wp-content/uploads/EUROP-White-Paper.pdf', '2024-11-22',
   '{"reference_currency": "EUR", "issuer_home_member_state": "FR", "issuer_competent_authority": "ACPR", "data_retrieved_at": "2026-10-22"}'),
  ('EURAU', 'AllUnity EUR',     'multichain', 'AllUnity GmbH', '3912007G8L8CD3HFIV26', 'emt', true, 'emi',
   'https://allunity.com/whitepaper', '2025-06-20',
   '{"reference_currency": "EUR", "issuer_home_member_state": "DE", "issuer_competent_authority": "BaFin", "data_retrieved_at": "2026-10-22"}')
on conflict do nothing;

-- Стейбълкойни без емитент в регистъра на ESMA (EMTWP.csv и ARTZZ.csv, 22.10.2026) — като USDT в 0004.
insert into public.crypto_assets
  (symbol, name, blockchain, issuer_name, mica_classification, identifiable_issuer, issuer_authorisation, metadata)
values
  ('FDUSD', 'First Digital USD', 'multichain', 'First Digital Labs', 'emt', true, 'none',
   '{"reference_currency": "USD", "compliance_note": "Емитентът не фигурира в регистъра на ESMA за EMT/ART (22.10.2026).", "data_retrieved_at": "2026-10-22"}'),
  ('TUSD',  'TrueUSD',           'multichain', 'Techteryx', 'emt', true, 'none',
   '{"reference_currency": "USD", "compliance_note": "Емитентът не фигурира в регистъра на ESMA за EMT/ART (22.10.2026).", "data_retrieved_at": "2026-10-22"}')
on conflict do nothing;

-- Основни монети на собствени вериги (Дял II). Дали има идентифицируем емитент е въпрос на преценка
-- (съображение 22; ESMA Q&A 2552), затова identifiable_issuer остава null — проверката пита.
insert into public.crypto_assets (symbol, name, blockchain, mica_classification, identifiable_issuer, metadata)
values
  ('SOL',  'Solana',    'solana',    'other_crypto_asset', null, '{"issuer_note": "Изисква документирана преценка дали има идентифицируем емитент"}'),
  ('XRP',  'XRP',       'xrp-ledger','other_crypto_asset', null, '{"issuer_note": "Изисква документирана преценка дали има идентифицируем емитент"}'),
  ('ADA',  'Cardano',   'cardano',   'other_crypto_asset', null, '{"issuer_note": "Изисква документирана преценка дали има идентифицируем емитент"}'),
  ('DOGE', 'Dogecoin',  'dogecoin',  'other_crypto_asset', null, '{"issuer_note": "Изисква документирана преценка дали има идентифицируем емитент"}'),
  ('LTC',  'Litecoin',  'litecoin',  'other_crypto_asset', null, '{"issuer_note": "Изисква документирана преценка дали има идентифицируем емитент"}'),
  ('DOT',  'Polkadot',  'polkadot',  'other_crypto_asset', null, '{"issuer_note": "Изисква документирана преценка дали има идентифицируем емитент"}'),
  ('AVAX', 'Avalanche', 'avalanche', 'other_crypto_asset', null, '{"issuer_note": "Изисква документирана преценка дали има идентифицируем емитент"}'),
  ('TRX',  'TRON',      'tron',      'other_crypto_asset', null, '{"issuer_note": "Изисква документирана преценка дали има идентифицируем емитент"}'),
  ('BNB',  'BNB',       'bnb-chain', 'other_crypto_asset', null, '{"issuer_note": "Изисква документирана преценка дали има идентифицируем емитент"}'),
  ('TON',  'Toncoin',   'ton',       'other_crypto_asset', null, '{"issuer_note": "Изисква документирана преценка дали има идентифицируем емитент"}')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- C. LEI вече не е уникален
--    LEI се ползва само за търсене в публичния регистър на ESMA и не дава никакви права.
--    С уникалност първият, който въведе чужд LEI, блокира истинската фирма; а кантора,
--    която води организация за клиент, не може да въведе неговия LEI.
-- ---------------------------------------------------------------------
alter table public.organizations drop constraint if exists organizations_lei_key;
create index if not exists idx_organizations_lei on public.organizations (lei) where lei is not null;
