"use client";
import { useMemo, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { saveEstimateFull, saveInvoiceFull, type KanriResult } from "@/lib/kanri/actions";
import { PREFECTURES } from "@/lib/kanri/constants";
import type { Product, ProductSet } from "@/lib/kanri/products";
import type { MasterItem } from "@/lib/kanri/master-defs";

// 実スマート葬儀の「見積もり作成」「請求書追加」フォーム準拠（両者ほぼ同一・請求は宛名→請求先情報）
export interface FormInitial {
  id?: string;
  constructionNo?: string;
  customerId?: string; customerName?: string;
  deceasedName?: string;
  deceasedGender?: string; deceasedBirthDate?: string; deceasedDeathDate?: string; deceasedAge?: number; deceasedRelation?: string;
  addresseeKind?: string; addresseeLastName?: string; addresseeFirstName?: string; addresseeHonorific?: string;
  addresseeLastNameKana?: string; addresseeFirstNameKana?: string;
  addresseePostcode?: string; addresseePrefecture?: string; addresseeCity?: string; addresseeStreet?: string; addresseeBuilding?: string;
  title?: string; memo?: string; date1?: string; date2?: string;
  crematorium?: string; brand?: string;
  productSetId?: string;
  items?: { lineKind: "item" | "discount"; productId?: string | null; name: string; unitPrice: number; quantity: number }[];
  advance?: number; issuerCompany?: string; chargedOrg?: string; chargedUser?: string;
  staffName?: string; // 担当者(最終更新者)
  preConsultation?: boolean; // 事前相談
}
interface Props {
  asInvoice?: boolean;
  initial?: FormInitial;     // 編集モード
  products: Product[];
  productSets: ProductSet[];
  osonae: MasterItem[];      // その他オプション、お供えにかかる費用
  discounts: MasterItem[];   // 値引商品マスタ
  memorialServices?: MasterItem[]; // 葬儀・法要等マスタ
  purposes?: MasterItem[];         // 摘要設定マスタ
  templates?: MasterItem[];        // 見積書/請求書テンプレート
}
// 実スマート葬儀のオプションカード準拠の行データ
interface OptRow {
  key: number; productId: string; productName?: string;
  name: string; tagName: string;
  unitPrice: number;            // 単価(税抜)
  priceInclTax: string;         // 税込単価(入力時はこちらを税込金額として利用)
  cost: number;                 // 下代
  taxRate: number;              // 消費税率
  discount: number;             // 割引(税抜)
  quantity: number;
  deposit: boolean; depositOn: string;
  refundable: boolean; hiddenPaper: boolean;
  tradedOn: string; returnedQty: number; remarks: string;
  divideTitle: string;          // 区切りタイトル(カードの下に挿入)
}
function newOpt(p?: Product): OptRow {
  return { key: seq++, productId: p?.id ?? "", productName: p?.name, name: p?.name ?? "", tagName: "",
    unitPrice: p?.unitPrice ?? 0, priceInclTax: "", cost: p?.costPrice ?? 0, taxRate: p?.taxRate ?? 0.1,
    discount: 0, quantity: 1, deposit: false, depositOn: "", refundable: !!p?.refundable, hiddenPaper: false,
    tradedOn: "", returnedQty: 0, remarks: "", divideTitle: "" };
}
// 税込金額: 税込単価入力があればそれを優先、無ければ(単価*数量-割引)*(1+税率)
function optInclTotal(r: OptRow): number {
  const inc = Number(r.priceInclTax);
  if (r.priceInclTax !== "" && !isNaN(inc)) return Math.round(inc * r.quantity);
  return Math.round((r.unitPrice * r.quantity - r.discount) * (1 + r.taxRate));
}
function optExUnit(r: OptRow): number {
  const inc = Number(r.priceInclTax);
  if (r.priceInclTax !== "" && !isNaN(inc)) return Math.round(inc / (1 + r.taxRate));
  return r.unitPrice;
}
interface DiscRow { key: number; name: string; amount: number }
interface Hit { id: string; name: string; phone: string; address: string; birth: string }

let seq = 1;

// 担当者候補（計上担当者・葬儀担当で共通）
const STAFF_OPTIONS = ["松澤覚", "石川健太", "松浦 颯大", "吉田寿子", "川口典礼"];

export function EstimateCreateForm({ asInvoice, initial, products, productSets, osonae, discounts, memorialServices = [], purposes = [], templates = [] }: Props) {
  const [state, action, pending] = useActionState<KanriResult | null, FormData>(asInvoice ? saveInvoiceFull : saveEstimateFull, null);
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(initial?.customerId ? { id: initial.customerId, name: initial.customerName ?? "" } : null);
  const [newCustomer, setNewCustomer] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [q, setQ] = useState(""); const [hits, setHits] = useState<Hit[]>([]); const [loading, setLoading] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [chosenSet, setChosenSet] = useState<ProductSet | null>(initial?.productSetId ? (productSets.find((s) => s.id === initial.productSetId) ?? null) : null);
  // セット内訳（選択時に全展開・行ごとに「表示しない」チェック）
  const [setItems, setSetItems] = useState<{ name: string; quantity: number; hidden: boolean }[]>([]);
  async function loadSetItems(setId: string) {
    try {
      const res = await fetch(`/kanri/product-sets/${setId}/items`);
      const d = await res.json();
      setSetItems((d.items ?? []).map((it: { name: string; quantity: number; hideOnInvoice: boolean }) => ({ name: it.name, quantity: it.quantity || 1, hidden: !!it.hideOnInvoice })));
    } catch { setSetItems([]); }
  }
  const [prodOpen, setProdOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  // 編集時: 既存明細を復元（セット行=セット名一致は除外、値引は値引行へ、他はオプション行へ）
  const initItems = initial?.items ?? [];
  const initSetName = initial?.productSetId ? productSets.find((s) => s.id === initial.productSetId)?.name : undefined;
  const [opts, setOpts] = useState<OptRow[]>(
    initItems.filter((it) => it.lineKind === "item" && it.name !== initSetName).map((it) => ({ ...newOpt(), productId: it.productId ?? "", name: it.name, unitPrice: it.unitPrice, quantity: it.quantity }))
  );
  const [optPickKey, setOptPickKey] = useState<number | null>(null); // カード単位の商品選択対象
  // 見積の新規作成時: その他オプション(追加安置日数/追加ドライアイス/収骨容器一式/本尊セット一式)をデフォルト数量1に
  const defaultOsonaeQty: Record<string, number> = {};
  if (!initial && !asInvoice) {
    for (const m of osonae) {
      if (["追加安置日数", "追加ドライアイス", "収骨容器", "本尊セット"].some((kw) => m.name.includes(kw))) defaultOsonaeQty[m.id] = 1;
    }
  }
  const [osonaeQty, setOsonaeQty] = useState<Record<string, number>>(defaultOsonaeQty);
  const [discRows, setDiscRows] = useState<DiscRow[]>(initItems.filter((it) => it.lineKind === "discount").map((it) => ({ key: seq++, name: it.name, amount: Math.abs(it.unitPrice * it.quantity) })));
  const [advance, setAdvance] = useState(initial?.advance ? String(initial.advance) : "");
  // 参照モーダル・読込
  const [purposeOpen, setPurposeOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [memoVal, setMemoVal] = useState(initial?.memo ?? "");
  const [titleVal, setTitleVal] = useState(initial?.title ?? "");
  const [pno, setPno] = useState(initial?.constructionNo ?? "");
  const [deceased, setDeceased] = useState(initial?.deceasedName ?? "");
  // 対象者(故人)属性
  const [dGender, setDGender] = useState(initial?.deceasedGender ?? "");
  const [dBirth, setDBirth] = useState(initial?.deceasedBirthDate ?? "");
  const [dDeath, setDDeath] = useState(initial?.deceasedDeathDate ?? "");
  const [dRelation, setDRelation] = useState(initial?.deceasedRelation ?? "");
  // 事前相談・担当者(バリデーション用に制御化)
  const [isPre, setIsPre] = useState(initial?.preConsultation ?? false);
  const [chargedUser, setChargedUser] = useState(initial?.chargedUser ?? "");
  const [staffName, setStaffName] = useState(initial?.staffName ?? "");
  // 顧客を同時に新規登録の入力(バリデーション用に制御化)
  const [ncLast, setNcLast] = useState("");
  const [ncFirst, setNcFirst] = useState("");
  const [ncStreet, setNcStreet] = useState("");
  const [ncTel, setNcTel] = useState("");
  const [ncMobile, setNcMobile] = useState("");
  const [valErrors, setValErrors] = useState<string[]>([]);
  // 年齢: 没年月日 - 生年月日 で自動計算(いずれか未入力なら手入力値を保持)
  const calcAge = (birth: string, death: string): number | null => {
    if (!birth || !death) return null;
    const b = new Date(birth), d = new Date(death);
    if (isNaN(b.getTime()) || isNaN(d.getTime())) return null;
    let age = d.getFullYear() - b.getFullYear();
    const m = d.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && d.getDate() < b.getDate())) age--;
    return age >= 0 ? age : null;
  };
  const [dAge, setDAge] = useState(initial?.deceasedAge != null ? String(initial.deceasedAge) : "");
  const autoAge = calcAge(dBirth, dDeath);
  const ageValue = autoAge != null ? String(autoAge) : dAge;
  const [lookupMsg, setLookupMsg] = useState("");
  // 顧客を同時に新規登録: 郵便番号→住所自動入力
  const [ncPostcode, setNcPostcode] = useState("");
  const [ncPref, setNcPref] = useState("");
  const [ncCity, setNcCity] = useState("");
  const [zipMsg, setZipMsg] = useState("");
  async function lookupZip() {
    const z = ncPostcode.replace(/[^0-9]/g, "");
    if (z.length !== 7) { setZipMsg("郵便番号は7桁で入力してください"); return; }
    setZipMsg("検索中…");
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${z}`);
      const d = await res.json();
      if (d.results && d.results[0]) {
        setNcPref(d.results[0].address1 || "");
        setNcCity((d.results[0].address2 || "") + (d.results[0].address3 || ""));
        setZipMsg("住所を自動入力しました");
      } else setZipMsg("該当する住所が見つかりません");
    } catch { setZipMsg("住所検索に失敗しました"); }
  }

  async function search() {
    setLoading(true);
    try { const res = await fetch(`/kanri/customers/search?q=${encodeURIComponent(q)}`); setHits(await res.json()); }
    finally { setLoading(false); }
  }
  // 施行番号から対象者情報を読込む
  async function lookupPno() {
    if (!pno.trim()) { setLookupMsg("施行番号を入力してください"); return; }
    setLookupMsg("検索中…");
    try {
      const res = await fetch(`/kanri/estimates/lookup?pno=${encodeURIComponent(pno.trim())}`);
      const d = await res.json();
      if (d && d.found) {
        setDeceased(d.deceasedName ?? "");
        if (d.customerId) setCustomer({ id: d.customerId, name: d.customerName ?? "" });
        setLookupMsg("読込みました");
      } else setLookupMsg("該当する施行が見つかりません");
    } catch { setLookupMsg("読込みに失敗しました"); }
  }
  function addOpt(p?: Product) {
    setOpts((rs) => [...rs, newOpt(p)]);
  }
  function updOpt(key: number, patch: Partial<OptRow>) {
    setOpts((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  const totals = useMemo(() => {
    // 税込合計 = セット税込 + 各オプションの税込金額 + お供え税込 - 値引(税込換算)
    let inc = 0;
    if (chosenSet) inc += chosenSet.taxIncludedPrice || Math.round(chosenSet.price * (1 + chosenSet.tax));
    for (const r of opts) inc += optInclTotal(r);
    for (const m of osonae) inc += Math.round((m.price ?? 0) * (osonaeQty[m.id] ?? 0) * 1.1);
    let disc = 0; for (const d of discRows) disc += Math.round(Math.abs(d.amount) * 1.1);
    return { total: inc - disc };
  }, [chosenSet, opts, osonae, osonaeQty, discRows]);

  const itemsJson = JSON.stringify([
    ...(chosenSet ? [{ lineKind: "item", name: chosenSet.name, unitPrice: chosenSet.price, quantity: 1, taxRate: chosenSet.tax, isSet: true }] : []),
    // セット内訳（金額0・isSetItem、非表示チェックはhiddenで保持 → 印刷で除外）
    ...(chosenSet ? setItems.map((it) => ({ lineKind: "item", name: it.name, unitPrice: 0, quantity: it.quantity, taxRate: 0, isSetItem: true, hidden: it.hidden })) : []),
    ...opts.filter((r) => r.name).map((r) => ({
      lineKind: "item", productId: r.productId || null, name: r.name,
      unitPrice: optExUnit(r), quantity: r.quantity, taxRate: r.taxRate,
      tagName: r.tagName || null, cost: r.cost, discount: r.discount,
      deposit: r.deposit, refundable: r.refundable, hidden: r.hiddenPaper,
      tradedOn: r.tradedOn || null, returnedQty: r.returnedQty, remarks: r.remarks || null, divideTitle: r.divideTitle || null,
    })),
    ...osonae.filter((m) => (osonaeQty[m.id] ?? 0) > 0).map((m) => ({ lineKind: "item", name: m.name, unitPrice: m.price ?? 0, quantity: osonaeQty[m.id], taxRate: 0.1, isOsonae: true })),
    ...discRows.filter((d) => d.name).map((d) => ({ lineKind: "discount", name: d.name, unitPrice: Math.abs(d.amount), quantity: 1, taxRate: 0.1 })),
  ]);

  const inp = "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#2c8c6f] focus:outline-none";
  const label = asInvoice ? "請求先情報" : "宛名情報";

  // 登録前バリデーション（見積のみ）。事前相談チェックの有無で必須項目が変わる。
  function validate(): string[] {
    const m: string[] = [];
    const hasCustomer = !!customer || newCustomer;
    if (!hasCustomer) m.push("顧客（選択または「顧客を同時に新規登録」）");
    if (!titleVal.trim()) m.push("件名");
    if (!chargedUser.trim()) m.push("計上担当者");
    if (!staffName.trim()) m.push("担当者（葬儀担当）");
    if (!isPre) {
      // 本見積もり: 顧客情報・対象者情報も必須
      if (newCustomer) {
        if (!ncLast.trim()) m.push("顧客氏");
        if (!ncFirst.trim()) m.push("顧客名");
        if (!ncPostcode.trim()) m.push("郵便番号");
        if (!ncPref.trim()) m.push("都道府県");
        if (!ncCity.trim()) m.push("市区町村");
        if (!ncStreet.trim()) m.push("番地");
        if (!ncTel.trim() && !ncMobile.trim()) m.push("自宅電話番号または携帯電話番号");
      }
      if (!deceased.trim()) m.push("対象者名");
      if (!dGender) m.push("性別");
      if (!dBirth) m.push("生年月日");
      if (!dDeath) m.push("没年月日");
    }
    return m;
  }
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (asInvoice) return; // 請求書は従来どおり
    const m = validate();
    if (m.length) {
      e.preventDefault();
      setValErrors(m);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setValErrors([]);
    }
  }

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-4 pb-20">
      {state && state.ok === false && <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{state.error}</p>}
      {valErrors.length > 0 && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-bold">次の項目が未入力のため登録できません。入力してから登録してください。</p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">{valErrors.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="items" value={itemsJson} />
      <input type="hidden" name="customer_id" value={customer?.id ?? ""} />
      <input type="hidden" name="product_set_id" value={chosenSet?.id ?? ""} />
      <input type="hidden" name="product_set_price" value={chosenSet?.price ?? 0} />
      <input type="hidden" name="advance_payment" value={advance || "0"} />

      {/* 事前相談（見積のみ・一番上） */}
      {!asInvoice && (
        <Card>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <input type="checkbox" name="is_pre_consultation" checked={isPre} onChange={(e) => setIsPre(e.target.checked)} className="h-4 w-4" />
            事前相談
          </label>
          <p className="mt-1 text-xs text-gray-400">事前相談の場合、喪主情報・故人情報が未確定のままでも登録できます。</p>
        </Card>
      )}

      {/* 施行番号 */}
      <Card>
        <F label="施行番号">
          <div className="flex gap-2">
            <input name="construction_no" value={pno} onChange={(e) => setPno(e.target.value)} className={inp} />
            <button type="button" onClick={lookupPno} className="whitespace-nowrap rounded border px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">施行番号から<br />対象者情報を読込む</button>
          </div>
          {lookupMsg && <p className="mt-1 text-xs text-[#2c8c6f]">{lookupMsg}</p>}
        </F>
      </Card>

      {/* 顧客 */}
      <Card>
        <F label="顧客" required>
          <div className="flex gap-2">
            <input readOnly value={customer?.name ?? ""} placeholder="未選択" className={inp} />
            <button type="button" onClick={() => { setPickOpen(true); setHits([]); setQ(""); }} className="rounded border border-[#2bb8ae] px-4 py-2 text-sm text-[#2bb8ae]">選択</button>
          </div>
        </F>
        <label className="mt-2 flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={newCustomer} onChange={(e) => setNewCustomer(e.target.checked)} name="create_customer" value="true" /> 顧客を同時に新規登録</label>
        {newCustomer && (
          <div className="mt-3 space-y-3 rounded border border-gray-200 bg-gray-50/50 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="顧客氏"><input name="new_customer_last_name" value={ncLast} onChange={(e) => setNcLast(e.target.value)} className={inp} /></F>
              <F label="顧客名"><input name="new_customer_first_name" value={ncFirst} onChange={(e) => setNcFirst(e.target.value)} className={inp} /></F>
            </div>
            <div>
              <label className="block text-sm text-gray-600">顧客郵便番号</label>
              <div className="mt-1 flex gap-2">
                <input name="new_customer_postcode" value={ncPostcode} onChange={(e) => setNcPostcode(e.target.value)} onBlur={lookupZip} placeholder="ハイフン無し（例:3330833）" className={inp} />
                <button type="button" onClick={lookupZip} className="whitespace-nowrap rounded border border-[#2c8c6f] px-3 py-2 text-xs text-[#2c8c6f] hover:bg-[#f0faf8]">住所検索</button>
              </div>
              {zipMsg && <p className="mt-1 text-xs text-[#2c8c6f]">{zipMsg}</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <F label="都道府県"><input name="new_customer_prefecture" value={ncPref} onChange={(e) => setNcPref(e.target.value)} className={inp} /></F>
              <div className="sm:col-span-2"><F label="市区町村"><input name="new_customer_city" value={ncCity} onChange={(e) => setNcCity(e.target.value)} className={inp} /></F></div>
            </div>
            <F label="番地・建物名など"><input name="new_customer_street" value={ncStreet} onChange={(e) => setNcStreet(e.target.value)} className={inp} /></F>
            <div className="grid gap-3 sm:grid-cols-3">
              <F label="自宅番号"><input name="new_customer_tel" value={ncTel} onChange={(e) => setNcTel(e.target.value)} className={inp} placeholder="ハイフン無し" /></F>
              <F label="携帯番号"><input name="new_customer_mobile" value={ncMobile} onChange={(e) => setNcMobile(e.target.value)} className={inp} placeholder="ハイフン無し" /></F>
              <F label="メールアドレス"><input name="new_customer_email" type="email" className={inp} /></F>
            </div>
          </div>
        )}
        <div className="mt-3"><F label="対象者名"><input name="deceased_name" value={deceased} onChange={(e) => setDeceased(e.target.value)} className={inp} placeholder="対象者（故人）氏名" /></F></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <F label="性別">
            <select name="deceased_gender" value={dGender} onChange={(e) => setDGender(e.target.value)} className={inp}>
              <option value="">選択</option><option value="male">男性</option><option value="female">女性</option><option value="other">その他</option>
            </select>
          </F>
          <F label="生年月日"><input type="date" name="deceased_birth_date" value={dBirth} onChange={(e) => setDBirth(e.target.value)} className={inp} /></F>
          <F label="没年月日"><input type="date" name="deceased_death_date" value={dDeath} onChange={(e) => setDDeath(e.target.value)} className={inp} /></F>
          <F label="年齢（享年）">
            <div className="flex items-center gap-1">
              <input type="number" name="deceased_age" value={ageValue} onChange={(e) => setDAge(e.target.value)} readOnly={autoAge != null} className={`${inp} ${autoAge != null ? "bg-gray-50 text-gray-600" : ""}`} placeholder="歳" />
              <span className="whitespace-nowrap text-sm text-gray-500">歳</span>
            </div>
            {autoAge != null && <p className="mt-0.5 text-[11px] text-gray-400">生年月日・没年月日から自動計算</p>}
          </F>
        </div>
        <div className="mt-3 sm:max-w-xs">
          <F label="関係（続柄）">
            <input name="mourner_relation" list="relation-list" value={dRelation} onChange={(e) => setDRelation(e.target.value)} className={inp} placeholder="例：父・母・夫・妻・子 など" />
            <datalist id="relation-list"><option>父</option><option>母</option><option>夫</option><option>妻</option><option>子</option><option>祖父</option><option>祖母</option><option>兄</option><option>弟</option><option>姉</option><option>妹</option><option>本人</option><option>その他</option></datalist>
            <p className="mt-0.5 text-[11px] text-gray-400">顧客（喪主）から見た対象者との関係</p>
          </F>
        </div>
      </Card>

      {/* 宛名情報 / 請求先情報 */}
      <Card title={label}>
        <F label={label}>
          <select name="addressee_kind" defaultValue={initial?.addresseeKind ?? "喪主"} className={inp}><option>喪主</option><option>顧客</option><option>その他</option></select>
        </F>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_90px]">
          <F label={asInvoice ? "請求先名(氏)" : "宛名(氏)"}><input name="addressee_last_name" defaultValue={initial?.addresseeLastName ?? ""} className={inp} /><p className="mt-0.5 text-[11px] text-gray-400">企業名などはこちらに入力してください</p></F>
          <F label={asInvoice ? "請求先名(名)" : "宛名(名)"}><input name="addressee_first_name" defaultValue={initial?.addresseeFirstName ?? ""} className={inp} /></F>
          <F label="敬称"><select name="addressee_honorific" defaultValue={initial?.addresseeHonorific ?? "様"} className={inp}><option>様</option><option>御中</option><option value="">なし</option></select></F>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <F label={asInvoice ? "請求先名カナ(氏)" : "宛名カナ(氏)"}><input name="addressee_last_name_kana" defaultValue={initial?.addresseeLastNameKana ?? ""} className={inp} /></F>
          <F label={asInvoice ? "請求先名カナ(名)" : "宛名カナ(名)"}><input name="addressee_first_name_kana" defaultValue={initial?.addresseeFirstNameKana ?? ""} className={inp} /></F>
        </div>
        <div className="mt-3"><F label="郵便番号"><input name="addressee_postcode" defaultValue={initial?.addresseePostcode ?? ""} className={inp} placeholder="ハイフン(-)無しで入力してください" /></F></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <F label="都道府県"><select name="addressee_prefecture" defaultValue={initial?.addresseePrefecture ?? ""} className={inp}><option value="">選択</option>{PREFECTURES.map((p) => <option key={p}>{p}</option>)}</select></F>
          <F label="市区町村"><input name="addressee_address_city" defaultValue={initial?.addresseeCity ?? ""} className={inp} /></F>
          <F label="番地"><input name="addressee_address_street" defaultValue={initial?.addresseeStreet ?? ""} className={inp} /></F>
          <F label="建物名など"><input name="addressee_address_building" defaultValue={initial?.addresseeBuilding ?? ""} className={inp} /></F>
        </div>
      </Card>

      {/* 件名・摘要・日付 */}
      <Card>
        <F label="件名" required><input name="title" required value={titleVal} onChange={(e) => setTitleVal(e.target.value)} className={inp} /></F>
        <div className="mt-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">摘要
            {purposes.length > 0 && <button type="button" onClick={() => setPurposeOpen(true)} className="rounded border border-blue-400 px-2 py-0.5 text-xs text-blue-500">参照</button>}
          </label>
          <input name="memo" value={memoVal} onChange={(e) => setMemoVal(e.target.value)} className={inp + " mt-1"} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {asInvoice ? (<>
            <F label="請求日" required><input type="date" name="billed_on" required defaultValue={initial?.date1 ?? ""} className={inp} /></F>
            <F label="お支払い期限"><input type="date" name="due_on" defaultValue={initial?.date2 ?? ""} className={inp} /></F>
          </>) : (<>
            <F label="見積日"><input type="date" name="estimate_on" defaultValue={initial?.date1 ?? ""} className={inp} /></F>
            <F label="見積有効期限"><input type="date" name="estimate_limit_on" defaultValue={initial?.date2 ?? ""} className={inp} /></F>
          </>)}
        </div>
        <div className="mt-3"><F label="火葬場"><input name="crematorium_name" defaultValue={initial?.crematorium ?? ""} className={inp} /></F></div>
        <div className="mt-3"><F label="ブランド"><select name="brand" defaultValue={initial?.brand ?? ""} className={inp}><option value=""></option><option>川口典礼</option></select></F></div>
        <div className="mt-3"><F label="在庫管理会場"><input name="stock_venue" className={inp} /></F></div>
      </Card>

      {/* セット商品 */}
      <Card title="セット商品">
        {chosenSet ? (
          <div className="rounded border border-[#2c8c6f] bg-[#f0faf8] px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <div><p className="font-bold">{chosenSet.name}</p><p className="text-xs text-gray-500">セット価格(税抜) {chosenSet.price.toLocaleString()}円 / (税込) {chosenSet.taxIncludedPrice.toLocaleString()}円</p></div>
              <button type="button" onClick={() => { setChosenSet(null); setSetItems([]); }} className="rounded border border-red-400 px-3 py-1 text-xs text-red-500">解除</button>
            </div>
            {/* セット内訳の全展開＋「表示しない」チェック */}
            {setItems.length > 0 && (
              <div className="mt-3 border-t border-[#bfe3dc] pt-2">
                <p className="mb-1 text-xs font-bold text-gray-600">セットに含まれるもの（チェックした商品は見積書/請求書に表示しません）</p>
                <div className="divide-y divide-[#e0f0ec]">
                  {setItems.map((it, i) => (
                    <label key={i} className="flex items-center gap-3 py-1.5 text-sm">
                      <input type="checkbox" checked={it.hidden} onChange={(e) => setSetItems((rs) => rs.map((x, j) => j === i ? { ...x, hidden: e.target.checked } : x))} />
                      <span className={it.hidden ? "text-gray-400 line-through" : ""}>{it.name}</span>
                      <span className="ml-auto text-xs text-gray-400">×{it.quantity}</span>
                      <span className="w-16 text-right text-xs text-red-400">{it.hidden ? "表示しない" : ""}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : <p className="text-sm text-red-400">設定されていません</p>}
        <button type="button" onClick={() => setSetOpen(true)} className="mt-2 rounded bg-sky-400 px-3 py-1.5 text-xs text-white">セット商品選択</button>
      </Card>

      {/* オプション */}
      <Card title="オプション">
        {opts.length > 0 && (
          <div className="mb-3 space-y-4">
            {opts.map((r) => (
              <div key={r.key}>
                {/* オプションカード（実UI準拠） */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  {/* ヘッダー: 商品選択 / 選択した商品 / 複製・削除 */}
                  <div className="mb-3 flex items-center gap-3">
                    <button type="button" onClick={() => setOptPickKey(r.key)} className="rounded border border-sky-400 px-3 py-1 text-xs text-sky-500">商品選択</button>
                    <span className="text-xs text-gray-500">選択した商品：{r.productName ?? "未選択"}</span>
                    <div className="ml-auto flex gap-2">
                      <button type="button" onClick={() => setOpts((rs) => { const src = rs.find((x) => x.key === r.key)!; return [...rs, { ...src, key: seq++ }]; })} className="rounded bg-sky-400 px-3 py-1 text-xs text-white">複製</button>
                      <button type="button" onClick={() => setOpts((rs) => rs.filter((x) => x.key !== r.key))} className="rounded bg-red-500 px-3 py-1 text-xs text-white">削除</button>
                    </div>
                  </div>
                  {/* 項目名 / 札名 */}
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div>
                      <label className="block text-sm text-gray-600">項目名 <span className="rounded bg-orange-400 px-1.5 py-0.5 text-[10px] text-white">必須</span></label>
                      <input value={r.name} onChange={(e) => updOpt(r.key, { name: e.target.value })} className={inp + " mt-1"} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">札名</label>
                      <input value={r.tagName} onChange={(e) => updOpt(r.key, { tagName: e.target.value })} className={inp + " mt-1"} />
                    </div>
                  </div>
                  {/* 単価 / 税込単価 / 下代 / 消費税率 / 割引(税抜) / 数量 */}
                  <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div>
                      <label className="block text-sm text-gray-600">単価</label>
                      <input type="number" value={r.unitPrice} onChange={(e) => updOpt(r.key, { unitPrice: Number(e.target.value) || 0 })} className={inp + " mt-1 text-right"} />
                      <p className="mt-0.5 text-[10px] text-gray-400">税抜か税込のどちらかは必須入力です</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">税込単価</label>
                      <input type="number" value={r.priceInclTax} onChange={(e) => updOpt(r.key, { priceInclTax: e.target.value })} className={inp + " mt-1 text-right"} />
                      <p className="mt-0.5 text-[10px] text-gray-400">入力すると、この金額がそのまま税込金額として利用されます。</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">下代 <span className="rounded bg-orange-400 px-1.5 py-0.5 text-[10px] text-white">必須</span></label>
                      <input type="number" value={r.cost} onChange={(e) => updOpt(r.key, { cost: Number(e.target.value) || 0 })} className={inp + " mt-1 text-right"} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">消費税率 <span className="rounded bg-orange-400 px-1.5 py-0.5 text-[10px] text-white">必須</span></label>
                      <select value={String(r.taxRate)} onChange={(e) => updOpt(r.key, { taxRate: Number(e.target.value) })} className={inp + " mt-1"}>
                        <option value="0.1">10%</option><option value="0.08">8%</option><option value="0">非課税</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">割引（税抜）</label>
                      <input type="number" value={r.discount || ""} onChange={(e) => updOpt(r.key, { discount: Number(e.target.value) || 0 })} className={inp + " mt-1 text-right"} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">数量 <span className="rounded bg-orange-400 px-1.5 py-0.5 text-[10px] text-white">必須</span></label>
                      <input type="number" value={r.quantity} onChange={(e) => updOpt(r.key, { quantity: Number(e.target.value) || 1 })} className={inp + " mt-1 text-center"} />
                    </div>
                  </div>
                  {/* 税込金額（自動計算・印刷にも反映） */}
                  <div className="mt-2 text-right text-sm">
                    <span className="text-gray-500">税込金額：</span>
                    <span className="text-base font-bold text-[#2c8c6f]">{optInclTotal(r).toLocaleString()}円</span>
                  </div>
                  {/* 預り金/立替金/請求書に非表示/取引日/返品数/補足説明 */}
                  <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-2 border-t pt-3 text-sm">
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1"><input type="checkbox" checked={r.deposit} onChange={(e) => updOpt(r.key, { deposit: e.target.checked })} /> 預り金</label>
                      <div><label className="block text-xs text-gray-500">預り金の計上日</label><input type="date" value={r.depositOn} onChange={(e) => updOpt(r.key, { depositOn: e.target.value })} className="rounded border px-2 py-1 text-xs" /></div>
                    </div>
                    <div className="space-y-1">
                      <label className="flex items-center gap-1"><input type="checkbox" checked={r.refundable} onChange={(e) => updOpt(r.key, { refundable: e.target.checked })} /> 立替金</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={r.hiddenPaper} onChange={(e) => updOpt(r.key, { hiddenPaper: e.target.checked })} /> 請求書に非表示</label>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">取引日</label>
                      <input type="date" value={r.tradedOn} onChange={(e) => updOpt(r.key, { tradedOn: e.target.value })} className="rounded border px-2 py-1 text-xs" />
                      <p className="text-[10px] text-gray-400">空の場合は請求日となります</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">返品数</label>
                      <input type="number" value={r.returnedQty || ""} onChange={(e) => updOpt(r.key, { returnedQty: Number(e.target.value) || 0 })} className="w-24 rounded border px-2 py-1 text-xs" />
                    </div>
                    <div className="min-w-[240px] flex-1">
                      <label className="block text-xs text-gray-500">補足説明</label>
                      <input value={r.remarks} onChange={(e) => updOpt(r.key, { remarks: e.target.value })} className={inp + " mt-0.5"} />
                    </div>
                  </div>
                </div>
                {/* 区切りタイトル */}
                <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3">
                  <label className="block text-sm text-gray-600">区切りタイトル</label>
                  <input value={r.divideTitle} onChange={(e) => updOpt(r.key, { divideTitle: e.target.value })} className={inp + " mt-1"} />
                  <p className="mt-0.5 text-[10px] text-gray-400">入力すると、請求書に区切りを差し込みます。</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => addOpt()} className="rounded bg-sky-400 px-3 py-1.5 text-xs text-white">オプション追加</button>
          <button type="button" onClick={() => { setProdOpen(true); setChecked(new Set()); }} className="rounded border border-sky-400 px-3 py-1.5 text-xs text-sky-500">☰ 商品を連続して追加</button>
        </div>
      </Card>

      {/* カード単位の商品選択モーダル */}
      {optPickKey !== null && (
        <Modal title="商品選択" onClose={() => setOptPickKey(null)}>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b bg-white text-xs text-gray-500"><tr>{["", "商品名", "種別", "価格(税抜)"].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {products.filter((p) => !p.hidden).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2"><button type="button" onClick={() => { updOpt(optPickKey, { productId: p.id, productName: p.name, name: p.name, unitPrice: p.unitPrice, cost: p.costPrice ?? 0, taxRate: p.taxRate }); setOptPickKey(null); }} className="rounded border border-blue-400 px-3 py-1 text-xs text-blue-500">選択</button></td>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-gray-500">{p.productKind ?? ""}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">{p.unitPrice.toLocaleString()}円</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* その他オプション、お供えにかかる費用 */}
      <Card title="その他オプション、お供えにかかる費用">
        {osonae.length === 0 ? <p className="text-sm text-gray-400">マスタが未登録です（設定 &gt; その他オプション、お供えにかかる費用）。</p> : (
          <div className="divide-y">
            {osonae.map((m) => (
              <div key={m.id} className="grid grid-cols-[1fr_110px_1fr] items-center gap-4 py-2.5 text-sm">
                <span>{m.name}</span>
                <span className="text-right text-gray-600">{(m.price ?? 0).toLocaleString()}円</span>
                <input type="number" min={0} value={osonaeQty[m.id] ?? 0} onChange={(e) => setOsonaeQty((s) => ({ ...s, [m.id]: Number(e.target.value) || 0 }))} className="rounded border border-[#8fd0c8] px-3 py-1.5 text-sm" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 値引商品 */}
      <Card title="値引商品">
        {discRows.length > 0 && (
          <div className="mb-2 space-y-2">
            {discRows.map((d) => (
              <div key={d.key} className="flex items-center gap-2">
                <select value={d.name} onChange={(e) => {
                  const m = discounts.find((x) => x.name === e.target.value);
                  setDiscRows((rs) => rs.map((x) => x.key === d.key ? { ...x, name: e.target.value, amount: m?.price ?? x.amount } : x));
                }} className={inp + " flex-1"}>
                  <option value="">値引商品を選択</option>
                  {discounts.map((m) => <option key={m.id} value={m.name}>{m.name}（{(m.price ?? 0).toLocaleString()}円）</option>)}
                </select>
                <input type="number" value={d.amount} onChange={(e) => setDiscRows((rs) => rs.map((x) => x.key === d.key ? { ...x, amount: Number(e.target.value) || 0 } : x))} className="w-32 rounded border border-gray-300 px-2 py-2 text-sm text-right" />
                <button type="button" onClick={() => setDiscRows((rs) => rs.filter((x) => x.key !== d.key))} className="rounded bg-red-500 px-2 py-1.5 text-xs text-white">削除</button>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={() => setDiscRows((rs) => [...rs, { key: seq++, name: "", amount: 0 }])} className="rounded bg-sky-400 px-3 py-1.5 text-xs text-white">＋ 追加</button>
      </Card>

      {/* 葬儀・法要等 */}
      <Card title="葬儀・法要等">
        <button type="button" onClick={() => { if (memorialServices.length === 0) return; const m = memorialServices[0]; setOpts((rs) => [...rs, { ...newOpt(), name: m.name, unitPrice: m.price ?? 0 }]); }} className="rounded bg-sky-400 px-3 py-1.5 text-xs text-white">葬儀・法要等 追加</button>
        {memorialServices.length === 0 && <p className="mt-1 text-xs text-gray-400">法要マスタが未登録です（設定 &gt; 法要設定）。登録するとここから追加できます。</p>}
        {memorialServices.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {memorialServices.map((m) => (
              <button key={m.id} type="button" onClick={() => setOpts((rs) => [...rs, { ...newOpt(), name: m.name, unitPrice: m.price ?? 0 }])} className="rounded border border-[#2c8c6f] px-2.5 py-1 text-xs text-[#2c8c6f] hover:bg-[#f0faf8]">{m.name}</button>
            ))}
          </div>
        )}
      </Card>

      {/* 前受金・発行情報 */}
      <Card>
        <F label="前受金"><input type="number" value={advance} onChange={(e) => setAdvance(e.target.value)} className={inp} /></F>
        <div className="mt-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            {templates.length > 0 && <button type="button" onClick={() => setTplOpen(true)} className="rounded border border-blue-400 px-2 py-0.5 text-xs text-blue-500">テンプレート参照</button>}
          </label>
        </div>
        <div className="mt-2"><F label="発行会社"><input name="issuer_company" defaultValue={initial?.issuerCompany ?? "株式会社 川口典礼"} className={inp} /></F></div>
        <div className="mt-3"><F label="計上組織"><input name="charged_org" defaultValue={initial?.chargedOrg ?? ""} className={inp} /></F></div>
        <div className="mt-3">
          <F label="計上担当者" required>
            <select name="charged_user" value={chargedUser} onChange={(e) => setChargedUser(e.target.value)} className={inp}>
              <option value="">選択してください</option>
              {STAFF_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </F>
        </div>
        <div className="mt-3">
          <F label="担当者（葬儀担当）" required>
            <select name="staff_name" value={staffName} onChange={(e) => setStaffName(e.target.value)} className={inp}>
              <option value="">選択してください</option>
              {STAFF_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </F>
        </div>
      </Card>

      <div className="flex gap-3">
        <button disabled={pending || (asInvoice && !customer && !newCustomer)} className="rounded bg-[#2c8c6f] px-6 py-2.5 text-sm text-white disabled:opacity-50">{pending ? "保存中…" : "登録する"}</button>
        <Link href={asInvoice ? "/kanri/billing" : "/kanri/estimates"} className="rounded border bg-white px-6 py-2.5 text-sm">キャンセル</Link>
      </div>

      {/* 右下固定 合計バー */}
      <div className="fixed bottom-0 right-0 z-30 flex items-center gap-6 bg-[#f2683f] px-6 py-3 text-white shadow-lg">
        <span className="text-sm">合計</span>
        <span className="text-xl font-bold">{totals.total.toLocaleString()} 円</span>
      </div>

      {/* 顧客ピッカー */}
      {pickOpen && (
        <Modal title="顧客を選択してください。" onClose={() => setPickOpen(false)}>
          <div className="rounded-lg bg-gray-50 p-4">
            <label className="mb-1 block text-xs text-gray-500">キーワード（氏名/カナ/電話/メール/顧客番号）</label>
            <div className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} className={inp} />
              <button type="button" onClick={search} className="rounded bg-[#5b6ee1] px-5 py-2 text-sm text-white">検索</button>
            </div>
          </div>
          <div className="mt-3 max-h-80 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b bg-white text-xs text-gray-500"><tr>{["", "氏名", "電話番号 / 住所", "生年月日"].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {loading ? <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">検索中…</td></tr> :
                  hits.length === 0 ? <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">「検索」で顧客を絞り込んでください。</td></tr> :
                    hits.map((h) => (
                      <tr key={h.id}>
                        <td className="px-3 py-2"><button type="button" onClick={() => { setCustomer({ id: h.id, name: h.name }); setPickOpen(false); }} className="rounded border border-blue-400 px-3 py-1 text-xs text-blue-500">選択</button></td>
                        <td className="px-3 py-2">{h.name}</td>
                        <td className="px-3 py-2 text-gray-500">{[h.phone, h.address].filter(Boolean).join(" / ") || "—"}</td>
                        <td className="px-3 py-2 text-gray-500">{h.birth || "—"}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* セット商品選択モーダル */}
      {setOpen && (
        <Modal title="セット商品選択" onClose={() => setSetOpen(false)}>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b bg-white text-xs text-gray-500"><tr>{["", "セット名", "セット価格(税抜)", "セット価格(税込)"].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {productSets.filter((s) => !s.hidden).map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2"><button type="button" onClick={() => { setChosenSet(s); setSetOpen(false); loadSetItems(s.id); }} className="rounded border border-blue-400 px-3 py-1 text-xs text-blue-500">選択</button></td>
                    <td className="px-3 py-2">{s.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">{s.price.toLocaleString()}円</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">{s.taxIncludedPrice.toLocaleString()}円</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* 摘要 参照モーダル */}
      {purposeOpen && (
        <Modal title="摘要 参照" onClose={() => setPurposeOpen(false)}>
          <div className="max-h-80 overflow-y-auto divide-y">
            {purposes.map((m) => (
              <button key={m.id} type="button" onClick={() => { setMemoVal(m.name); setPurposeOpen(false); }} className="block w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50">{m.name}</button>
            ))}
          </div>
        </Modal>
      )}

      {/* テンプレート参照モーダル */}
      {tplOpen && (
        <Modal title="テンプレート参照" onClose={() => setTplOpen(false)}>
          <div className="max-h-80 overflow-y-auto divide-y">
            {templates.map((m) => (
              <button key={m.id} type="button" onClick={() => { setTitleVal(m.name); if (m.extra?.body) setMemoVal(m.extra.body); setTplOpen(false); }} className="block w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50">
                <span className="font-medium">{m.name}</span>
                {m.extra?.body && <span className="ml-2 text-xs text-gray-400">{m.extra.body.slice(0, 40)}</span>}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* 商品を連続して追加モーダル */}
      {prodOpen && (
        <Modal title="商品を連続して追加" onClose={() => setProdOpen(false)}>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b bg-white text-xs text-gray-500"><tr>{["", "商品名", "種別", "価格(税抜)"].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {products.filter((p) => !p.hidden).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2"><input type="checkbox" checked={checked.has(p.id)} onChange={(e) => setChecked((s) => { const n = new Set(s); if (e.target.checked) n.add(p.id); else n.delete(p.id); return n; })} /></td>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-gray-500">{p.productKind ?? ""}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">{p.unitPrice.toLocaleString()}円</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-right">
            <button type="button" onClick={() => { products.filter((p) => checked.has(p.id)).forEach((p) => addOpt(p)); setProdOpen(false); }} className="rounded bg-[#5b6ee1] px-5 py-2 text-sm text-white">追加（{checked.size}件）</button>
          </div>
        </Modal>
      )}
    </form>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return <div className="rounded-lg bg-white p-5 shadow-sm">{title && <p className="mb-3 font-bold text-gray-700">{title}</p>}{children}</div>;
}
function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div><label className="block text-sm text-gray-600">{label}{required && <span className="ml-1 rounded bg-orange-400 px-1.5 py-0.5 text-[10px] text-white">必須</span>}</label><div className="mt-1">{children}</div></div>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
      <div className="mt-14 w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><p className="font-bold text-gray-800">{title}</p><button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button></div>
        {children}
      </div>
    </div>
  );
}
