// Тестове на разчитането на регистъра на ESMA. Пускане: node tests/esma-register.test.mts
import {
  parseCsv,
  toRecords,
  mapRecords,
  normalizeLei,
  isValidLei,
  findMistypedLei,
  parseEsmaDate,
  parseServices,
  buildCaspEntry,
  buildIssuerEntry,
  pickWhitepaper,
  syncEsmaRegister,
  ESMA_REGISTER_FILES,
} from "../src/lib/esma/register.ts";

let passed = 0, failed = 0;
function eq(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`✓ ${name}`); }
  else { failed++; console.log(`✗ ${name}\n    получено: ${a}\n    очаквано: ${e}`); }
}

// ---- CSV: BOM, кавички, запетаи и нов ред в поле, CRLF, празни колони накрая ----
const CASP_CSV =
  "﻿ae_competentAuthority,ae_homeMemberState,ae_lei_name,ae_lei,ae_lei_cou_code,ae_commercial_name,ae_address,ae_website,ae_website_platform,ac_authorisationNotificationDate,ac_authorisationEndDate,ac_serviceCode,ac_serviceCode_cou,ac_comments,ac_lastupdate,ac_legal_basis,,,\r\n" +
  'Financial Supervision Commission (FSC),BG,Belayer ООD,64882N0ABXS71817AI18,BG,Belayer,"ул. ""Тест"" 1,\nСофия",https://belayer.example,,28/04/2026,,a.\tproviding custody and administration of crypto-assets on behalf of clients | e. execution of orders for crypto-assets on behalf of clients | providing portfolio management on crypto-assets;,BG,,05/05/2026,Article 63 - CASP authorisation,,,\r\n' +
  "Austrian Financial Market Authority (FMA),AT,Old GmbH,89450036UW3ID72T1M84.,AT,Old,Wien,https://old.example,,01/02/2025,24/04/2026,d. exchange of crypto-assets for other | j. providing transfer services for crypto-assets on behalf of clients,AT,,30/04/2026,Article 60 - Notification,,,\r\n" +
  "Austrian Financial Market Authority (FMA),AT,Bad Lei AG,59800G0P3PV13KLX615,AT,Bad,Wien,,,31/02/2025,,x. something new,AT,,,,,,\r\n";

eq("CSV: 4 реда (заглавие + 3)", parseCsv(CASP_CSV).length, 4);
const { headers, records } = toRecords(CASP_CSV);
eq("CSV: BOM е премахнат от първата колона", headers[0], "ae_competentAuthority");
eq("CSV: кавички, запетая и нов ред в поле", records[0].ae_address, 'ул. "Тест" 1,\nСофия');
eq("CSV: празните колони се пропускат", Object.keys(records[0]).includes(""), false);

const { rows, warnings } = mapRecords("casp", records);
eq("Услуги: табулация, без буква, „;“", rows[0].services, ["custody", "execution", "portfolio"]);
eq("Услуги: съкратено „for other“", rows[1].services, ["exchange_crypto", "transfer"]);
eq("Правно основание", rows.map((r) => r.legal_basis), ["art63", "art60", null]);
eq("LEI с точка накрая се почиства", rows[1].lei, "89450036UW3ID72T1M84");
eq("Невалидно LEI -> null", rows[2].lei, null);
eq("Невалидна дата 31/02 -> null", rows[2].authorisation_date, null);
eq("Предупреждения: невалидно LEI и неразпозната услуга", warnings.length, 2);
eq("Оригиналният ред се пази", rows[0].details.ae_lei_name, "Belayer ООD");

eq("LEI: контролни цифри (ISO 17442)", ["969500OYUDADGZKCR583", "5493007WZ7IFULIL8G21", "64882N0ABXS71817AI18", "969500OYUDADGZKCR584", "5493007WZ7IFULIL8G2"].map(isValidLei), [true, true, true, false, false]);
// Грешно вписано в регистъра: 8945001TKX2A5OJMNR45 (OSL EU GmbH) — опитваме кое валидно LEI е на един знак от него
{
  const reg = "8945001TKX2A5OJMNR45";
  let fixed: string | null = null;
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  outer: for (let i = 0; i < 20; i++) for (const ch of alphabet) {
    const c = reg.slice(0, i) + ch + reg.slice(i + 1);
    if (c !== reg && isValidLei(c)) { fixed = c; break outer; }
  }
  eq("LEI с грешка в регистъра: намира се по LEI на един знак разлика", fixed ? findMistypedLei(fixed, [reg, "969500OYUDADGZKCR583"]) : "няма", reg);
  eq("LEI с грешка: валидно LEI в регистъра не се „поправя“", findMistypedLei("969500OYUDADGZKCR583", ["969500OYUDADGZKCR584".replace("584", "583")]), null);
  eq("LEI с грешка: разменени съседни знаци", findMistypedLei("5493007WZ7IFULIL8G21", ["5493007WZ7IFULI8LG21"]), "5493007WZ7IFULI8LG21");
}
eq("normalizeLei", [normalizeLei(" 969500oyudadgzkcr583 "), normalizeLei("123")], ["969500OYUDADGZKCR583", null]);
eq("parseEsmaDate", [parseEsmaDate("09/04/2025"), parseEsmaDate("9.4.2025"), parseEsmaDate("2025-04-09"), parseEsmaDate("")], ["2025-04-09", "2025-04-09", null, null]);
eq("parseServices: обмен срещу средства/криптоактиви се различава",
  parseServices("c. exchange of crypto-assets for funds | d. exchange of crypto-assets for other crypto-assets").services,
  ["exchange_funds", "exchange_crypto"]);
eq("parseServices: само буква", parseServices("b. | h.").services, ["trading_platform", "advice"]);

// ---- Обединяване по LEI ----
const today = "2026-10-28";
const belayer = buildCaspEntry([rows[0]], today)!;
eq("CASP: действащ запис", [belayer.legal_basis, belayer.authorised_on, belayer.ended_on], ["art63", "2026-04-28", null]);
const old = buildCaspEntry([rows[1]], today)!;
eq("CASP: прекратен запис", [old.ended_on, old.services], ["2026-04-24", []]);
eq("CASP: няма записи -> null", buildCaspEntry([], today), null);
const merged = buildCaspEntry([{ ...rows[0] }, { ...rows[0], services: ["transfer"], authorisation_date: "2026-06-01", legal_basis: null }], today)!;
eq("CASP: услугите от няколко реда се обединяват", merged.services, ["custody", "execution", "portfolio", "transfer"]);

const EMT_CSV =
  "﻿ae_competentAuthority,ae_homeMemberState,ae_lei_name,ae_lei,ae_lei_cou_code,ae_commercial_name,ae_address,ae_website,ac_authorisationNotificationDate,ac_authorisationEndDate,ae_exemption48_4,ae_exemption48_5,ae_authorisation_other_emt,ae_DTI_FFG,ae_DTI,wp_url,wp_authorisationNotificationDate,wp_comments,wp_lastupdate\n" +
  "ACPR,FR,Circle Internet Financial Europe SAS,969500OYUDADGZKCR583,FR,Circle,Paris,https://circle.com,01/07/2024,,,,Electronic money institution,,,https://www.circle.com/fr/legal/mica-eurc-whitepaper,01/07/2024,,24/12/2025\n" +
  "ACPR,FR,Circle Internet Financial Europe SAS,969500OYUDADGZKCR583,FR,Circle,Paris,https://circle.com,01/07/2024,,,,Electronic money institution,,,https://www.circle.com/fr/legal/mica-usdc-whitepaper,01/07/2024,,15/09/2026\n" +
  "ACPR,FR,Circle Internet Financial Europe SAS,969500OYUDADGZKCR583,FR,Circle,Paris,https://circle.com,01/07/2024,,,,Electronic money institution,,,https://www.circle.com/fr/legal/mica-usdc-whitepaper,01/06/2024,,01/06/2024\n" +
  "CNB,CZ,Bank AS,213800W1NGBLERUS6M39,CZ,Bank,Praha,,28/08/2024,,,,Credit Institution,,,https://bank.example/wp.pdf,28/08/2024,,\n";
const emt = mapRecords("emt", toRecords(EMT_CSV).records).rows;
eq("EMT: вид лиценз", emt.map((r) => r.issuer_authorisation), ["emi", "emi", "emi", "credit_institution"]);
const circle = buildIssuerEntry(emt.filter((r) => r.lei === "969500OYUDADGZKCR583"), today)!;
eq("EMT: бели книги без дубликати, с най-новата дата", circle.whitepapers.map((w) => [w.url.slice(-20), w.notified_on]), [
  ["mica-eurc-whitepaper", "2024-07-01"],
  ["mica-usdc-whitepaper", "2024-07-01"],
]);
eq("EMT: бяла книга по символ", [pickWhitepaper(circle, "USDC")?.url.endsWith("usdc-whitepaper"), pickWhitepaper(circle, "EURC")?.url.endsWith("eurc-whitepaper")], [true, true]);
eq("EMT: непознат символ при няколко бели книги -> null", pickWhitepaper(circle, "XYZ"), null);
eq("EMT: символът не съвпада с част от дума", pickWhitepaper(circle, "USD"), null);
const bank = buildIssuerEntry(emt.filter((r) => r.lei === "213800W1NGBLERUS6M39"), today)!;
eq("EMT: една бяла книга -> ползва се тя", pickWhitepaper(bank, "ABCD")?.url, "https://bank.example/wp.pdf");

// ---- Синхронизация с фалшив клиент и фалшиво сваляне ----
type Call = { table?: string; op: string; args?: unknown };
function fakeClient(prevRows: Record<string, number>) {
  const calls: Call[] = [];
  const chain = (table: string) => {
    const q: any = {
      _op: "select",
      insert(v: unknown) { calls.push({ table, op: "insert", args: v }); q._op = "insert"; return q; },
      update(v: unknown) { calls.push({ table, op: "update", args: v }); q._op = "update"; return q; },
      select() { return q; },
      eq(_c: string, v: string) { q._eq = v; return q; },
      single() { return Promise.resolve({ data: { id: "00000000-0000-0000-0000-000000000001" }, error: null }); },
      maybeSingle() {
        const n = prevRows[q._eq];
        return Promise.resolve({ data: n === undefined ? null : { rows: n, sha256: "old" }, error: null });
      },
      then(res: (v: unknown) => void) { res({ data: null, error: null }); },
    };
    return q;
  };
  return {
    calls,
    from: (t: string) => chain(t),
    rpc: (fn: string, args: Record<string, unknown>) => {
      calls.push({ op: `rpc:${fn}`, args });
      return Promise.resolve({ data: (args.p_rows as unknown[]).length, error: null });
    },
  };
}
const ART_CSV = "ae_competentAuthority,ae_homeMemberState,ae_lei_name,ae_lei,ae_lei_cou_code,ae_commercial_name,ae_address,ae_website,ac_authorisationNotificationDate,ac_authorisationEndDate,ae_credit_institution,wp_url,wp_authorisationNotificationDate,wp_url_cou,wp_comments,wp_lastupdate\n";
const NCASP_CSV = "ae_competentAuthority,ae_homeMemberState,ae_lei_name,ae_lei,ae_lei_cou_code,ae_commercial_name,ae_website,ae_infrigment,ae_reason,ae_decision_date,ae_comments,ae_lastupdate\nFSMA,BE,Bank Bit,,BE,Bank Bit,www.bank-bit.com,No,без лиценз,29/06/2026,,07/09/2026\n";
const fakeFetch = (bodies: Record<string, string | number>) =>
  (async (url: string) => {
    const b = bodies[url];
    return typeof b === "number" ? new Response("", { status: b }) : new Response(b ?? "", { status: 200 });
  }) as unknown as typeof fetch;

{
  const c = fakeClient({});
  const rep = await syncEsmaRegister(c, {
    trigger: "script",
    fetchImpl: fakeFetch({
      [ESMA_REGISTER_FILES.casp]: CASP_CSV,
      [ESMA_REGISTER_FILES.emt]: EMT_CSV,
      [ESMA_REGISTER_FILES.art]: ART_CSV,
      [ESMA_REGISTER_FILES.ncasp]: NCASP_CSV,
    }),
  });
  eq("Синхронизация: всички файлове", [rep.status, rep.files.map((f) => f.rows)], ["succeeded", [3, 4, 0, 1]]);
  eq("Синхронизация: по едно извикване на замяната за регистър", c.calls.filter((x) => x.op === "rpc:esma_replace_register").length, 4);
}
{
  const c = fakeClient({ casp: 400 });
  const rep = await syncEsmaRegister(c, {
    trigger: "script",
    only: ["casp", "emt"],
    fetchImpl: fakeFetch({ [ESMA_REGISTER_FILES.casp]: CASP_CSV, [ESMA_REGISTER_FILES.emt]: 503 }),
  });
  eq("Защита: рязък спад на редовете се отхвърля", rep.files[0].ok, false);
  eq("Защита: HTTP грешка не спира другите файлове", [rep.status, rep.files[1].error], ["failed", "HTTP 503 при сваляне"]);
  eq("Защита: нищо не е записано", c.calls.filter((x) => x.op.startsWith("rpc:")).length, 0);
}
{
  const c = fakeClient({});
  const rep = await syncEsmaRegister(c, {
    trigger: "script",
    only: ["casp"],
    fetchImpl: fakeFetch({ [ESMA_REGISTER_FILES.casp]: "name,lei\nX,Y\n" }),
  });
  eq("Защита: променен формат (липсващи колони)", rep.files[0].error?.startsWith("променен формат"), true);
}

console.log(`\n${passed} успешни, ${failed} неуспешни`);
if (failed > 0) process.exit(1);
