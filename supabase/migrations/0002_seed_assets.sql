-- =====================================================================
-- MiCA-Guard — начални данни: активен набор правила + примерни активи
-- Пусни веднъж в Supabase -> SQL Editor.
-- Безопасно е да се пусне повторно (on conflict do nothing).
-- =====================================================================

-- Активен набор правила (версията се записва във всяка проверка)
insert into public.rule_sets (version, description, is_active)
values (
  'mica-2026.10-preview',
  'Предварителен набор автоматични правила (v0). Не е правно становище.',
  true
)
on conflict (version) do nothing;

-- Нативни монети (без емитент и без смарт контракт)
insert into public.crypto_assets (symbol, name, blockchain, mica_classification, metadata)
values
  ('BTC', 'Bitcoin',  'bitcoin',  'other_crypto_asset', '{"note": "Няма идентифициран емитент/оферент"}'),
  ('ETH', 'Ethereum', 'ethereum', 'other_crypto_asset', '{"note": "Няма идентифициран емитент/оферент"}')
on conflict do nothing;

-- Токени за електронни пари (EMT), емитирани от Circle в ЕС
-- Източник: Circle press release, 01.07.2024 (EMI лиценз от ACPR, Франция)
insert into public.crypto_assets
  (symbol, name, blockchain, contract_address, issuer_name, mica_classification, metadata)
values
  ('USDC', 'USD Coin', 'ethereum', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
   'Circle Internet Financial Europe SAS', 'emt',
   '{"reference_currency": "USD", "issuer_licence": "EMI (ACPR, FR)"}'),
  ('EURC', 'Euro Coin', 'ethereum', '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
   'Circle Internet Financial Europe SAS', 'emt',
   '{"reference_currency": "EUR", "issuer_licence": "EMI (ACPR, FR)"}')
on conflict do nothing;
