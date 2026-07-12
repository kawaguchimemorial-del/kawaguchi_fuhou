"use client";
import { useEffect, useMemo, useState } from "react";
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
  deceasedLastName?: string; deceasedFirstName?: string;
  deceasedGender?: string; deceasedBirthDate?: string; deceasedDeathDate?: string; deceasedAge?: number; deceasedRelation?: string;
  wakeAt?: string; funeralAt?: string; venueName?: string;
  addresseeKind?: string; addresseeLastName?: string; addresseeFirstName?: string; addresseeHonorific?: string;
  addresseeLastNameKana?: string; addresseeFirstNameKana?: string;
  addresseePostcode?: string; addresseePrefecture?: string; addresseeCity?: string; addresseeStreet?: string; addresseeBuilding?: string;
  title?: string; memo?: string; date1?: string; date2?: string;
  crematorium?: string; brand?: string;
  productSetId?: string;
  estimateId?: string; // 請求書newを見積からプレフィルする際の紐付け元
  mournerLastName?: string; mournerFirstName?: string; mournerKana?: string; mournerPhone?: string;
  mournerPostcode?: string; mournerPrefecture?: string; mournerCity?: string; mournerStreet?: string; mournerBuilding?: string;
  wakeMealCount?: number | null; funeralMealCount?: number | null; imibaraiFee?: number | null;
  items?: { lineKind: "item" | "discount"; productId?: string | null; name: string; unitPrice: number; quantity: number; isSetItem?: boolean; hiddenPaper?: boolean; priceIncludingTax?: number }[];
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
// 料理の配膳人(15人に1名, 15,000円税抜)・忌中払会場費 の自動明細名
const MEAL_SERVER_UNIT = 15000;
const AUTO_MEAL_NAMES = new Set(["通夜料理配膳人", "告別料理配膳人", "忌中払会場費"]);

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

// ISO文字列 → datetime-local(YYYY-MM-DDTHH:mm)
function toLocal(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function EstimateCreateForm({ asInvoice, initial, products, productSets, osonae, discounts, memorialServices = [], purposes = [], templates = [] }: Props) {
  const [state, action, pending] = useActionState<KanriResult | null, FormData>(asInvoice ? saveInvoiceFull : saveEstimateFull, null);
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(initial?.customerId ? { id: initial.customerId, name: initial.customerName ?? "" } : null);
  const [newCustomer, setNewCustomer] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [q, setQ] = useState(""); const [hits, setHits] = useState<Hit[]>([]); const [loading, setLoading] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [chosenSet, setChosenSet] = useState<ProductSet | null>(initial?.productSetId ? (productSets.find((s) => s.id === initial.productSetId) ?? null) : null);
  // 個別セット価格(会員価格等)の復元: 保存済みのセット価格行(セット名一致)がマスタ価格と異なる場合はそちらを優先。
  // 新しいセットを選び直したら解除(マスタ価格に戻る)。
  const [setPriceOv, setSetPriceOv] = useState<{ ex: number; inc: number } | null>(() => {
    if (!initial?.productSetId) return null;
    const master = productSets.find((ps) => ps.id === initial.productSetId);
    const parent = master ? initial.items?.find((it) => it.lineKind === "item" && !it.isSetItem && it.name === master.name) : null;
    if (!master || !parent) return null;
    const inc = parent.priceIncludingTax ?? Math.round(parent.unitPrice * (1 + (master.tax || 0.1)));
    if (parent.unitPrice !== master.price) return { ex: parent.unitPrice, inc };
    return null;
  });
  const setEffEx = setPriceOv?.ex ?? chosenSet?.price ?? 0;
  const setEffInc = setPriceOv?.inc ?? (chosenSet ? (chosenSet.taxIncludedPrice || Math.round(chosenSet.price * (1 + chosenSet.tax))) : 0);
  // セット内訳（選択時に全展開・行ごとに「表示しない」チェック）
  // 編集時: 保存済みのセット内訳(is_set_item)を復元し、非表示チェック(hidden_paper)も引き継ぐ。
  const initSetItems = (initial?.items ?? [])
    .filter((it) => it.isSetItem)
    .map((it) => ({ name: it.name, quantity: it.quantity || 1, hidden: !!it.hiddenPaper }));
  const [setItems, setSetItems] = useState<{ name: string; quantity: number; hidden: boolean }[]>(initSetItems);
  async function loadSetItems(setId: string) {
    try {
      const res = await fetch(`/kanri/product-sets/${setId}/items`);
      const d = await res.json();
      setSetItems((d.items ?? []).map((it: { name: string; quantity: number; hideOnInvoice: boolean }) => ({ name: it.name, quantity: it.quantity || 1, hidden: !!it.hideOnInvoice })));
    } catch { setSetItems([]); }
  }
  const [prodOpen, setProdOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  // 編集時: 既存明細を復元（セット価格行=セット名一致 と セット内訳=is_set_item は除外、値引は値引行へ、他はオプション行へ）
  const initItems = initial?.items ?? [];
  const initSetName = initial?.productSetId ? productSets.find((s) => s.id === initial.productSetId)?.name : undefined;
  // お供え/その他費用は名称で判別（保存明細に専用フラグが無いため、お供えマスタ名と一致＝お供え行）。
  const osonaeIdByName = useMemo(() => new Map(osonae.map((m) => [m.name, m.id])), [osonae]);
  const isOsonaeLine = (it: { lineKind: string; productId?: string | null; name: string }) =>
    it.lineKind === "item" && !it.productId && osonaeIdByName.has(it.name);
  const [opts, setOpts] = useState<OptRow[]>(
    initItems
      .filter((it) => it.lineKind === "item" && !it.isSetItem && it.name !== initSetName && !isOsonaeLine(it) && !(!asInvoice && AUTO_MEAL_NAMES.has(it.name)))
      .map((it) => ({ ...newOpt(), productId: it.productId ?? "", name: it.name, unitPrice: it.unitPrice, quantity: it.quantity }))
  );
  // 旧データ救済: セット選択済みなのに保存済みセット内訳が無い場合のみ、セット定義から内訳を読み込む。
  useEffect(() => {
    if (chosenSet && initSetItems.length === 0) loadSetItems(chosenSet.id);
    // マウント時のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [optPickKey, setOptPickKey] = useState<number | null>(null); // カード単位の商品選択対象
  // 商品選択モーダルの絞り込み（種別を選んで商品名で検索）
  const [pickKind, setPickKind] = useState("");
  const [pickSub, setPickSub] = useState("");
  const [pickName, setPickName] = useState("");
  const productKinds = useMemo(() => Array.from(new Set(products.map((p) => p.productKind).filter(Boolean))) as string[], [products]);
  // 子カテゴリ候補: 選択中の種別に属する商品の子カテゴリ（種別未選択なら全子カテゴリ）
  const productSubKinds = useMemo(
    () => Array.from(new Set(products.filter((p) => !pickKind || p.productKind === pickKind).map((p) => p.productSubKind).filter(Boolean))) as string[],
    [products, pickKind]
  );
  // お供え数量の初期値。
  // - 編集時: 保存済みのお供え明細(名称一致)から数量を復元する。
  // - 新規作成時: 既定のお供え(追加安置日数/追加ドライアイス/収骨容器一式/本尊セット一式)を数量1に。
  const initOsonaeQty: Record<string, number> = {};
  if (initial) {
    for (const it of initItems) {
      if (isOsonaeLine(it)) {
        const id = osonaeIdByName.get(it.name);
        if (id) initOsonaeQty[id] = it.quantity;
      }
    }
  } else if (!asInvoice) {
    for (const m of osonae) {
      if (["追加安置日数", "追加ドライアイス", "収骨容器", "本尊セット"].some((kw) => m.name.includes(kw))) initOsonaeQty[m.id] = 1;
    }
  }
  const [osonaeQty, setOsonaeQty] = useState<Record<string, number>>(initOsonaeQty);
  const [discRows, setDiscRows] = useState<DiscRow[]>(initItems.filter((it) => it.lineKind === "discount").map((it) => ({ key: seq++, name: it.name, amount: Math.abs(it.unitPrice * it.quantity) })));
  const [advance, setAdvance] = useState(initial?.advance ? String(initial.advance) : "");
  // 参照モーダル・読込
  const [purposeOpen, setPurposeOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [memoVal, setMemoVal] = useState(initial?.memo ?? "");
  const [titleVal, setTitleVal] = useState(initial?.title ?? "");
  const [pno, setPno] = useState(initial?.constructionNo ?? "");
  // 対象者(故人)氏名は氏・名に分離（訃報案内で氏名が正しく分かれるように）
  const _initName = (initial?.deceasedName ?? "").replace(/　/g, " ");
  const _initSp = _initName.indexOf(" ");
  const [deceasedLast, setDeceasedLast] = useState(initial?.deceasedLastName ?? (_initSp > 0 ? _initName.slice(0, _initSp) : _initName));
  const [deceasedFirst, setDeceasedFirst] = useState(initial?.deceasedFirstName ?? (_initSp > 0 ? _initName.slice(_initSp + 1) : ""));
  // 対象者(故人)属性
  const [dGender, setDGender] = useState(initial?.deceasedGender ?? "");
  const [dBirth, setDBirth] = useState(initial?.deceasedBirthDate ?? "");
  const [dDeath, setDDeath] = useState(initial?.deceasedDeathDate ?? "");
  const [dRelation, setDRelation] = useState(initial?.deceasedRelation ?? "");
  // 見積日（必須）・通夜日時・告別式日時
  const [estimateOn, setEstimateOn] = useState(initial?.date1 ?? "");
  // 料理: 通夜/告別式の料理人数 → 配膳人自動計算、告別式は忌中払会場費入力
  const [wakeMealCount, setWakeMealCount] = useState(initial?.wakeMealCount != null ? String(initial.wakeMealCount) : "");
  const [funeralMealCount, setFuneralMealCount] = useState(initial?.funeralMealCount != null ? String(initial.funeralMealCount) : "");
  const [imibaraiFee, setImibaraiFee] = useState(initial?.imibaraiFee != null ? String(initial.imibaraiFee) : "");
  const [wakeAt, setWakeAt] = useState(toLocal(initial?.wakeAt));
  const [funeralAt, setFuneralAt] = useState(toLocal(initial?.funeralAt));
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
  async function zipToAddr(postcode: string, setPref: (v: string) => void, setCity: (v: string) => void, setMsg: (v: string) => void) {
    const z = postcode.replace(/[^0-9]/g, "");
    if (z.length !== 7) { setMsg("郵便番号は7桁で入力してください"); return; }
    setMsg("検索中…");
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${z}`);
      const d = await res.json();
      if (d.results && d.results[0]) {
        setPref(d.results[0].address1 || "");
        setCity((d.results[0].address2 || "") + (d.results[0].address3 || ""));
        setMsg("住所を自動入力しました");
      } else setMsg("該当する住所が見つかりません");
    } catch { setMsg("住所検索に失敗しました"); }
  }
  // 郵便番号逆引き: 都道府県+市区町村(町域まで)から郵便番号を検索
  async function addrToZip(pref: string, city: string, setPostcode: (v: string) => void, setMsg: (v: string) => void) {
    const kw = (city || "").trim();
    if (!kw) { setMsg("市区町村（町域まで）を入力してください"); return; }
    setMsg("逆引き中…");
    try {
      const res = await fetch(`https://geoapi.heartrails.com/api/json?method=suggest&matching=like&keyword=${encodeURIComponent(kw)}`);
      const d = await res.json();
      const locs = (d.response?.location ?? []) as { prefecture: string; city: string; town: string; postal: string }[];
      const pool = pref ? locs.filter((l) => l.prefecture === pref) : locs;
      const hit = pool[0] ?? locs[0];
      if (hit) { setPostcode(hit.postal); setMsg(`〒${hit.postal}（${hit.prefecture}${hit.city}${hit.town}）を設定しました`); }
      else setMsg("該当する郵便番号が見つかりません。市区町村に町域名まで入力してください");
    } catch { setMsg("郵便番号逆引きに失敗しました"); }
  }
  const lookupZip = () => zipToAddr(ncPostcode, setNcPref, setNcCity, setZipMsg);
  // 宛名/請求先の郵便番号・住所(制御化して双方向検索に対応)
  const [adPostcode, setAdPostcode] = useState(initial?.addresseePostcode ?? "");
  const [adPref, setAdPref] = useState(initial?.addresseePrefecture ?? "");
  const [adCity, setAdCity] = useState(initial?.addresseeCity ?? "");
  const [adZipMsg, setAdZipMsg] = useState("");
  // 顧客と喪主が違う場合の喪主情報
  const [mournerDiff, setMournerDiff] = useState(!!(initial?.mournerLastName || initial?.mournerFirstName));
  const [mPostcode, setMPostcode] = useState(initial?.mournerPostcode ?? "");
  const [mPref, setMPref] = useState(initial?.mournerPrefecture ?? "");
  const [mCity, setMCity] = useState(initial?.mournerCity ?? "");
  const [mZipMsg, setMZipMsg] = useState("");

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
        { const dn = (d.deceasedName ?? "").replace(/　/g, " "); const sp = dn.indexOf(" "); setDeceasedLast(sp > 0 ? dn.slice(0, sp) : dn); setDeceasedFirst(sp > 0 ? dn.slice(sp + 1) : ""); }
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

  // 料理商品(種別が「料理」で始まる= 料理 / 料理（旬菜亭） / 料理（華鳳） など)が選択されているか。
  // productId が付かない経路で追加された場合に備え、商品名でも判定する。
  const cuisineProducts = useMemo(() => products.filter((p) => (p.productKind ?? "").startsWith("料理")), [products]);
  const cuisineIds = useMemo(() => new Set(cuisineProducts.map((p) => p.id)), [cuisineProducts]);
  const cuisineNames = useMemo(() => new Set(cuisineProducts.map((p) => p.name)), [cuisineProducts]);
  const hasCuisine = !asInvoice && opts.some((r) => (r.productId && cuisineIds.has(r.productId)) || (r.name && cuisineNames.has(r.name)));
  const wCount = Number(wakeMealCount) || 0;
  const fCount = Number(funeralMealCount) || 0;
  const wServers = wCount > 0 ? Math.ceil(wCount / 15) : 0;
  const fServers = fCount > 0 ? Math.ceil(fCount / 15) : 0;
  const imibarai = Number(imibaraiFee) || 0;
  const cuisineLines = hasCuisine ? [
    ...(wServers > 0 ? [{ lineKind: "item", name: "通夜料理配膳人", unitPrice: MEAL_SERVER_UNIT, quantity: wServers, taxRate: 0.1 }] : []),
    ...(fServers > 0 ? [{ lineKind: "item", name: "告別料理配膳人", unitPrice: MEAL_SERVER_UNIT, quantity: fServers, taxRate: 0.1 }] : []),
    ...(fCount > 0 && imibarai > 0 ? [{ lineKind: "item", name: "忌中払会場費", unitPrice: imibarai, quantity: 1, taxRate: 0.1 }] : []),
  ] : [];

  const totals = useMemo(() => {
    // 税込合計 = セット税込 + 各オプションの税込金額 + お供え税込 - 値引(税込換算)
    let inc = 0;
    if (chosenSet) inc += setEffInc;
    for (const r of opts) inc += optInclTotal(r);
    for (const m of osonae) inc += Math.round((m.price ?? 0) * (osonaeQty[m.id] ?? 0) * 1.1);
    for (const l of cuisineLines) inc += Math.round(l.unitPrice * l.quantity * 1.1);
    let disc = 0; for (const d of discRows) disc += Math.round(Math.abs(d.amount) * 1.1);
    return { total: inc - disc };
  }, [chosenSet, setEffInc, opts, osonae, osonaeQty, discRows, hasCuisine, wakeMealCount, funeralMealCount, imibaraiFee]);

  const itemsJson = JSON.stringify([
    ...(chosenSet ? [{ lineKind: "item", name: chosenSet.name, unitPrice: setEffEx, quantity: 1, taxRate: chosenSet.tax, isSet: true }] : []),
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
    ...cuisineLines,
    ...discRows.filter((d) => d.name).map((d) => ({ lineKind: "discount", name: d.name, unitPrice: Math.abs(d.amount), quantity: 1, taxRate: 0.1 })),
  ]);

  const inp = "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#2c8c6f] focus:outline-none";
  // スマホ縦入力用: 44pxタップ域・16pxでiOSズーム防止・数値スピナー除去
  const nInp = "h-11 w-full rounded-lg border border-gray-300 px-3 text-base tabular-nums appearance-none focus:border-[#2c8c6f] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
  const nLbl = "text-sm font-medium text-gray-700";
  const label = asInvoice ? "請求先情報" : "宛名情報";

  // 登録前バリデーション（見積のみ）。事前相談チェックの有無で必須項目が変わる。
  function validate(): string[] {
    const m: string[] = [];
    const hasCustomer = !!customer || newCustomer;
    if (!hasCustomer) m.push("顧客（選択または「顧客を同時に新規登録」）");
    if (!titleVal.trim()) m.push("件名");
    if (!chargedUser.trim()) m.push("計上担当者");
    if (!staffName.trim()) m.push("担当者（葬儀担当）");
    if (!estimateOn) m.push("見積日");
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
      if (!deceasedLast.trim()) m.push("対象者氏");
      if (!dGender) m.push("性別");
      if (!dBirth) m.push("生年月日");
      if (!dDeath) m.push("没年月日");
      if (!funeralAt) m.push("告別式日時（火葬日時）");
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
      <input type="hidden" name="has_cuisine" value={hasCuisine ? "1" : ""} />
      <input type="hidden" name="wake_meal_count" value={hasCuisine ? wakeMealCount : ""} />
      <input type="hidden" name="funeral_meal_count" value={hasCuisine ? funeralMealCount : ""} />
      <input type="hidden" name="imibarai_fee" value={hasCuisine ? imibaraiFee : ""} />
      <input type="hidden" name="customer_id" value={customer?.id ?? ""} />
      <input type="hidden" name="estimate_id" value={initial?.estimateId ?? ""} />
      <input type="hidden" name="product_set_id" value={chosenSet?.id ?? ""} />
      <input type="hidden" name="product_set_price" value={chosenSet ? setEffEx : 0} />
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
                <input name="new_customer_postcode" value={ncPostcode} onChange={(e) => setNcPostcode(e.target.value)} onBlur={lookupZip} placeholder="例:3330833" className={inp + " max-w-[130px]"} />
                <button type="button" onClick={lookupZip} className="whitespace-nowrap rounded border border-[#2c8c6f] px-3 py-2 text-xs text-[#2c8c6f] hover:bg-[#f0faf8]">住所検索</button>
                <button type="button" onClick={() => addrToZip(ncPref, ncCity, setNcPostcode, setZipMsg)} className="whitespace-nowrap rounded border border-[#4f7cff] px-3 py-2 text-xs text-[#4f7cff] hover:bg-blue-50">郵便番号逆引き</button>
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
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <F label="対象者氏"><input name="deceased_last_name" value={deceasedLast} onChange={(e) => setDeceasedLast(e.target.value)} className={inp} placeholder="姓（例：川口）" /></F>
          <F label="対象者名"><input name="deceased_first_name" value={deceasedFirst} onChange={(e) => setDeceasedFirst(e.target.value)} className={inp} placeholder="名（例：太郎）" /></F>
        </div>
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
        {/* 顧客と喪主が違う場合の喪主入力 */}
        <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={mournerDiff} onChange={(e) => setMournerDiff(e.target.checked)} className="h-4 w-4" />
          顧客と喪主は違う（喪主の情報を入力する）
        </label>
        {mournerDiff && (
          <div className="mt-3 rounded border border-dashed border-[#2c8c6f] bg-[#f7fcfb] p-3">
            <p className="mb-2 text-xs font-bold text-gray-600">喪主情報</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="喪主氏"><input name="mourner_last_name" defaultValue={initial?.mournerLastName ?? ""} className={inp} placeholder="姓" /></F>
              <F label="喪主名"><input name="mourner_first_name" defaultValue={initial?.mournerFirstName ?? ""} className={inp} placeholder="名" /></F>
              <F label="喪主カナ"><input name="mourner_kana" defaultValue={initial?.mournerKana ?? ""} className={inp} placeholder="例：カワグチ タロウ" /></F>
              <F label="電話番号"><input name="mourner_phone" defaultValue={initial?.mournerPhone ?? ""} className={inp} placeholder="ハイフン無し" /></F>
            </div>
            <div className="mt-3">
              <F label="郵便番号">
                <div className="flex items-center gap-2">
                  <input name="mourner_postcode" value={mPostcode} onChange={(e) => setMPostcode(e.target.value)} className={inp + " max-w-[130px]"} placeholder="例:3330833" />
                  <button type="button" onClick={() => zipToAddr(mPostcode, setMPref, setMCity, setMZipMsg)} className="whitespace-nowrap rounded border border-[#2c8c6f] px-3 py-2 text-xs text-[#2c8c6f] hover:bg-[#f0faf8]">住所検索</button>
                  <button type="button" onClick={() => addrToZip(mPref, mCity, setMPostcode, setMZipMsg)} className="whitespace-nowrap rounded border border-[#4f7cff] px-3 py-2 text-xs text-[#4f7cff] hover:bg-blue-50">郵便番号逆引き</button>
                </div>
                {mZipMsg && <p className="mt-1 text-xs text-gray-500">{mZipMsg}</p>}
              </F>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <F label="都道府県"><select name="mourner_prefecture" value={mPref} onChange={(e) => setMPref(e.target.value)} className={inp}><option value="">選択</option>{PREFECTURES.map((p) => <option key={p}>{p}</option>)}</select></F>
              <F label="市区町村"><input name="mourner_address_city" value={mCity} onChange={(e) => setMCity(e.target.value)} className={inp} /></F>
              <F label="番地"><input name="mourner_address_street" defaultValue={initial?.mournerStreet ?? ""} className={inp} /></F>
              <F label="建物名など"><input name="mourner_address_building" defaultValue={initial?.mournerBuilding ?? ""} className={inp} /></F>
            </div>
          </div>
        )}
      </Card>

      {/* 宛名情報 / 請求先情報 */}
      <Card title={label}>
        <F label={label}>
          <select name="addressee_kind" defaultValue={initial?.addresseeKind ?? "喪主"} className={inp}><option>喪主</option><option>顧客</option><option>その他</option><option>オンライン供花注文</option></select>
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
        <div className="mt-3">
          <F label="郵便番号">
            <div className="flex items-center gap-2">
              <input name="addressee_postcode" value={adPostcode} onChange={(e) => setAdPostcode(e.target.value)} className={inp + " max-w-[130px]"} placeholder="例:3330833" />
              <button type="button" onClick={() => zipToAddr(adPostcode, setAdPref, setAdCity, setAdZipMsg)} className="whitespace-nowrap rounded border border-[#2c8c6f] px-3 py-2 text-xs text-[#2c8c6f] hover:bg-[#f0faf8]">住所検索</button>
              <button type="button" onClick={() => addrToZip(adPref, adCity, setAdPostcode, setAdZipMsg)} className="whitespace-nowrap rounded border border-[#4f7cff] px-3 py-2 text-xs text-[#4f7cff] hover:bg-blue-50">郵便番号逆引き</button>
            </div>
            {adZipMsg && <p className="mt-1 text-xs text-gray-500">{adZipMsg}</p>}
          </F>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <F label="都道府県"><select name="addressee_prefecture" value={adPref} onChange={(e) => setAdPref(e.target.value)} className={inp}><option value="">選択</option>{PREFECTURES.map((p) => <option key={p}>{p}</option>)}</select></F>
          <F label="市区町村"><input name="addressee_address_city" value={adCity} onChange={(e) => setAdCity(e.target.value)} className={inp} placeholder="町域まで入れると逆引き精度が上がります" /></F>
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
            <F label="見積日" required><input type="date" name="estimate_on" required value={estimateOn} onChange={(e) => setEstimateOn(e.target.value)} className={inp} /></F>
            <F label="見積有効期限"><input type="date" name="estimate_limit_on" defaultValue={initial?.date2 ?? ""} className={inp} /></F>
          </>)}
        </div>
        {!asInvoice && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <F label="通夜日時"><input type="datetime-local" name="wake_at" value={wakeAt} onChange={(e) => setWakeAt(e.target.value)} className={inp} /></F>
            <F label="告別式日時（火葬日時）" required={!isPre}><input type="datetime-local" name="funeral_at" value={funeralAt} onChange={(e) => setFuneralAt(e.target.value)} className={inp} /></F>
          </div>
        )}
        <div className="mt-3"><F label="火葬場"><input name="crematorium_name" defaultValue={initial?.crematorium ?? ""} className={inp} /></F></div>
        <div className="mt-3"><F label="ブランド"><select name="brand" defaultValue={initial?.brand ?? ""} className={inp}><option value=""></option><option>川口典礼</option></select></F></div>
        <div className="mt-3"><F label="葬儀会場"><input name="venue_name" defaultValue={initial?.venueName ?? ""} className={inp} /></F></div>
      </Card>

      {/* セット商品 */}
      <Card title="セット商品">
        {chosenSet ? (
          <div className="rounded border border-[#2c8c6f] bg-[#f0faf8] px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <div><p className="font-bold">{chosenSet.name}</p><p className="text-xs text-gray-500">セット価格(税抜) {setEffEx.toLocaleString()}円 / (税込) {setEffInc.toLocaleString()}円{setPriceOv ? "（個別価格）" : ""}</p></div>
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
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => { setPickKind(""); setPickSub(""); setPickName(""); setOptPickKey(r.key); }} className="rounded border border-sky-400 px-3 py-1.5 text-xs text-sky-500">商品選択</button>
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
                  {/* 数量・下代・税率など6項目（スマホ縦は2列・PCは6列に復帰。入力頻度順） */}
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
                    <label className="flex flex-col gap-1">
                      <span className={nLbl}>下代 <span className="text-xs text-red-500">必須</span></span>
                      <input inputMode="decimal" type="text" value={r.cost} onChange={(e) => updOpt(r.key, { cost: Number(e.target.value) || 0 })} className={nInp + " text-right"} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={nLbl}>数量 <span className="text-xs text-red-500">必須</span></span>
                      <input inputMode="numeric" type="text" value={r.quantity} onChange={(e) => updOpt(r.key, { quantity: Number(e.target.value) || 1 })} className={nInp + " text-center"} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={nLbl}>消費税率 <span className="text-xs text-red-500">必須</span></span>
                      <select value={String(r.taxRate)} onChange={(e) => updOpt(r.key, { taxRate: Number(e.target.value) })} className={nInp}>
                        <option value="0.1">10%</option><option value="0.08">8%</option><option value="0">非課税</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={nLbl}>単価</span>
                      <input inputMode="decimal" type="text" value={r.unitPrice} onChange={(e) => updOpt(r.key, { unitPrice: Number(e.target.value) || 0 })} className={nInp + " text-right"} />
                      <span className="text-xs leading-tight text-gray-500">税抜か税込どちらか必須</span>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={nLbl}>税込単価</span>
                      <input inputMode="decimal" type="text" value={r.priceInclTax} onChange={(e) => updOpt(r.key, { priceInclTax: e.target.value })} className={nInp + " text-right"} />
                      <span className="text-xs leading-tight text-gray-500">入力するとこの額が税込金額に</span>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={nLbl}>割引（税抜）</span>
                      <input inputMode="decimal" type="text" value={r.discount || ""} onChange={(e) => updOpt(r.key, { discount: Number(e.target.value) || 0 })} className={nInp + " text-right"} />
                    </label>
                  </div>
                  {/* 税込金額（自動計算・印刷にも反映） */}
                  <div className="mt-2 text-right text-sm">
                    <span className="text-gray-500">税込金額：</span>
                    <span className="text-base font-bold text-[#2c8c6f]">{optInclTotal(r).toLocaleString()}円</span>
                  </div>
                  {/* 詳細（普段は使わない補助項目）: 既定で折りたたみ、縦1列に */}
                  <details className="group mt-3 border-t pt-3 text-sm">
                    <summary className="flex h-11 cursor-pointer list-none select-none items-center gap-2 text-gray-700">
                      <span>詳細設定（預り金・立替金・取引日・返品数ほか）</span>
                      {(r.deposit || r.refundable || r.hiddenPaper || r.depositOn || r.tradedOn || r.returnedQty > 0 || r.remarks) && <span className="h-2 w-2 rounded-full bg-teal-500 group-open:hidden" />}
                      <span className="ml-auto text-gray-400 transition-transform group-open:rotate-180">▾</span>
                    </summary>
                    <div className="mt-3 flex flex-col gap-4">
                      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={r.deposit} onChange={(e) => updOpt(r.key, { deposit: e.target.checked })} /> 預り金</label>
                      {r.deposit && (
                        <label className="flex flex-col gap-1 pl-7"><span className="text-sm text-gray-700">預り金の計上日</span><input type="date" value={r.depositOn} onChange={(e) => updOpt(r.key, { depositOn: e.target.value })} className="h-11 w-full rounded-lg border border-gray-300 px-3 text-base" /></label>
                      )}
                      <fieldset className="flex flex-col gap-2 rounded-md border border-gray-200 p-2">
                        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={r.refundable} onChange={(e) => updOpt(r.key, { refundable: e.target.checked })} /> 立替金</label>
                        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={r.hiddenPaper} onChange={(e) => updOpt(r.key, { hiddenPaper: e.target.checked })} /> 請求書に非表示</label>
                      </fieldset>
                      <label className="flex flex-col gap-1"><span className="text-sm text-gray-700">取引日</span><input type="date" value={r.tradedOn} onChange={(e) => updOpt(r.key, { tradedOn: e.target.value })} className="h-11 w-full rounded-lg border border-gray-300 px-3 text-base" /><span className="text-xs text-gray-500">空欄は請求日となります</span></label>
                      <label className="flex flex-col gap-1"><span className="text-sm text-gray-700">返品数</span><input inputMode="numeric" type="text" value={r.returnedQty || ""} onChange={(e) => updOpt(r.key, { returnedQty: Number(e.target.value) || 0 })} className="h-11 w-20 rounded-lg border border-gray-300 px-3 text-center text-base tabular-nums" /></label>
                      <label className="flex flex-col gap-1"><span className="text-sm text-gray-700">補足説明</span><textarea rows={2} value={r.remarks} onChange={(e) => updOpt(r.key, { remarks: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base" /></label>
                    </div>
                  </details>
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
          {/* 絞り込み: 種別を選んで商品名で検索 */}
          <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg bg-gray-50 p-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">種別</label>
              <select value={pickKind} onChange={(e) => { setPickKind(e.target.value); setPickSub(""); }} className={inp + " min-w-[10rem]"}>
                <option value="">すべて</option>
                {productKinds.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">子カテゴリ</label>
              <select value={pickSub} onChange={(e) => setPickSub(e.target.value)} className={inp + " min-w-[10rem]"} disabled={productSubKinds.length === 0}>
                <option value="">すべて</option>
                {productSubKinds.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500">商品名</label>
              <input value={pickName} onChange={(e) => setPickName(e.target.value)} placeholder="商品名で検索" className={inp} />
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b bg-white text-xs text-gray-500"><tr>{["", "商品名", "種別", "子カテゴリ", "価格(税抜)"].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {products.filter((p) => !p.hidden)
                  .filter((p) => !pickKind || p.productKind === pickKind)
                  .filter((p) => !pickSub || p.productSubKind === pickSub)
                  .filter((p) => !pickName.trim() || p.name.includes(pickName.trim()))
                  .map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2"><button type="button" onClick={() => { updOpt(optPickKey, { productId: p.id, productName: p.name, name: p.name, unitPrice: p.unitPrice, cost: p.costPrice ?? 0, taxRate: p.taxRate }); setOptPickKey(null); }} className="rounded border border-blue-400 px-3 py-1 text-xs text-blue-500">選択</button></td>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-gray-500">{p.productKind ?? ""}</td>
                    <td className="px-3 py-2 text-gray-500">{p.productSubKind ?? ""}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">{p.unitPrice.toLocaleString()}円</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* 料理(配膳人・忌中払会場費) — 料理商品を選んだ時のみ */}
      {hasCuisine && (
        <Card title="料理（配膳人・忌中払会場費）">
          <p className="mb-3 text-xs text-gray-500">配膳人は15名につき1名（16名で2名）・1名 {MEAL_SERVER_UNIT.toLocaleString()}円（税抜）が自動で計上されます。通夜がない場合は通夜料理人数を空欄にしてください。</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="通夜料理人数">
              <div className="flex items-center gap-2">
                <input inputMode="numeric" type="text" value={wakeMealCount} onChange={(e) => setWakeMealCount(e.target.value.replace(/[^0-9]/g, ""))} className={inp + " max-w-[120px]"} placeholder="人数" />
                <span className="text-xs text-gray-500">→ 配膳人 {wServers} 名 / {(wServers * MEAL_SERVER_UNIT).toLocaleString()}円（税抜）</span>
              </div>
            </F>
            <F label="告別式料理人数" required>
              <div className="flex items-center gap-2">
                <input inputMode="numeric" type="text" value={funeralMealCount} onChange={(e) => setFuneralMealCount(e.target.value.replace(/[^0-9]/g, ""))} className={inp + " max-w-[120px]"} placeholder="人数（必須）" />
                <span className="text-xs text-gray-500">→ 配膳人 {fServers} 名 / {(fServers * MEAL_SERVER_UNIT).toLocaleString()}円（税抜）</span>
              </div>
              {!funeralMealCount && <p className="mt-0.5 text-[11px] text-red-500">料理を選択した場合、告別式料理人数は必須です。</p>}
            </F>
          </div>
          {fCount > 0 && (
            <div className="mt-3 sm:max-w-xs">
              <F label="忌中払会場費（税抜・10%）">
                <input inputMode="numeric" type="text" value={imibaraiFee} onChange={(e) => setImibaraiFee(e.target.value.replace(/[^0-9]/g, ""))} className={inp} placeholder="金額（税抜）" />
                <p className="mt-0.5 text-[11px] text-gray-400">告別式の忌中払会場費（税込 {imibarai > 0 ? Math.round(imibarai * 1.1).toLocaleString() : 0}円）</p>
              </F>
            </div>
          )}
        </Card>
      )}

      {/* その他オプション、お供えにかかる費用 */}
      <Card title="その他オプション、お供えにかかる費用">
        {osonae.length === 0 ? <p className="text-sm text-gray-400">マスタが未登録です（設定 &gt; その他オプション、お供えにかかる費用）。</p> : (
          <div className="divide-y">
            {osonae.map((m) => (
              <div key={m.id} className="flex flex-col gap-1.5 py-2.5 text-sm sm:grid sm:grid-cols-[1fr_110px_auto] sm:items-center sm:gap-4">
                <span className="font-medium leading-snug text-gray-800">{m.name}</span>
                <div className="flex items-center justify-between gap-3 sm:contents">
                  <span className="tabular-nums text-gray-600 sm:text-right">{(m.price ?? 0).toLocaleString()}円</span>
                  <div className="flex shrink-0 items-center">
                    <button type="button" aria-label="数量を減らす" onClick={() => setOsonaeQty((s) => ({ ...s, [m.id]: Math.max(0, (s[m.id] ?? 0) - 1) }))} className="h-11 w-11 rounded-l-lg border border-[#8fd0c8] text-lg text-gray-600">−</button>
                    <input inputMode="numeric" type="text" value={osonaeQty[m.id] ?? 0} onChange={(e) => setOsonaeQty((s) => ({ ...s, [m.id]: Number(e.target.value) || 0 }))} className="h-11 w-12 border-y border-[#8fd0c8] text-center text-base tabular-nums focus:outline-none" />
                    <button type="button" aria-label="数量を増やす" onClick={() => setOsonaeQty((s) => ({ ...s, [m.id]: (s[m.id] ?? 0) + 1 }))} className="h-11 w-11 rounded-r-lg border border-[#8fd0c8] text-lg text-gray-600">＋</button>
                  </div>
                </div>
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

      {state && state.ok === false && <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-3">
        <button disabled={pending || (asInvoice && !customer && !newCustomer) || (!asInvoice && !estimateOn) || (!asInvoice && !isPre && !funeralAt) || (hasCuisine && !funeralMealCount)} className="rounded bg-[#2c8c6f] px-6 py-2.5 text-sm text-white disabled:opacity-50">{pending ? "保存中…" : "登録する"}</button>
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
                    <td className="px-3 py-2"><button type="button" onClick={() => { setChosenSet(s); setSetPriceOv(null); setSetOpen(false); loadSetItems(s.id); }} className="rounded border border-blue-400 px-3 py-1 text-xs text-blue-500">選択</button></td>
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
