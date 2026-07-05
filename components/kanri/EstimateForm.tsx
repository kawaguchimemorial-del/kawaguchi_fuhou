"use client";
import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { saveEstimate, type KanriResult } from "@/lib/kanri/actions";
import { GENDERS, PREFECTURES } from "@/lib/kanri/constants";
import type { Estimate, EstimateItem } from "@/lib/kanri/estimates";
import type { Product } from "@/lib/kanri/products";

type Row = { key: string; productId: string; lineKind: "item" | "discount"; name: string; unitPrice: number; quantity: number; taxRate: number };
let keyc = 0;
const nk = () => `r${keyc++}`;

function toLocal(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function EstimateForm({ products, estimate, defaultCustomerId, asInvoice }: { products: Product[]; estimate?: Estimate; defaultCustomerId?: string; asInvoice?: boolean }) {
  const [state, action, pending] = useActionState<KanriResult | null, FormData>(saveEstimate, null);
  const initial: Row[] = (estimate?.items ?? []).map((it: EstimateItem) => ({ key: nk(), productId: it.productId ?? "", lineKind: it.lineKind, name: it.name, unitPrice: it.unitPrice, quantity: it.quantity, taxRate: it.taxRate }));
  const [rows, setRows] = useState<Row[]>(initial.length ? initial : [{ key: nk(), productId: "", lineKind: "item", name: "", unitPrice: 0, quantity: 1, taxRate: 0.1 }]);

  const totals = useMemo(() => {
    let subtotal = 0, discount = 0, tax = 0;
    for (const r of rows) {
      const amt = (r.lineKind === "discount" ? -Math.abs(r.unitPrice * r.quantity) : r.unitPrice * r.quantity) || 0;
      if (r.lineKind === "discount") discount += Math.abs(amt); else subtotal += amt;
      tax += amt * (r.taxRate || 0);
    }
    tax = Math.round(tax);
    return { subtotal, discount, tax, total: subtotal - discount + tax };
  }, [rows]);

  function update(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function onPickProduct(key: string, pid: string) {
    const p = products.find((x) => x.id === pid);
    if (p) update(key, { productId: pid, name: p.name, unitPrice: p.unitPrice, taxRate: p.taxRate });
    else update(key, { productId: "" });
  }
  const addRow = (lineKind: "item" | "discount") => setRows((rs) => [...rs, { key: nk(), productId: "", lineKind, name: lineKind === "discount" ? "値引き" : "", unitPrice: 0, quantity: 1, taxRate: 0.1 }]);
  const removeRow = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));

  const itemsJson = JSON.stringify(rows.map((r) => ({ productId: r.productId || null, lineKind: r.lineKind, name: r.name, unitPrice: r.unitPrice, quantity: r.quantity, taxRate: r.taxRate })));
  const inp = "w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[#1aa39a] focus:outline-none";
  const d = estimate?.deceased ?? {}; const mo = estimate?.mourner ?? {};

  return (
    <form action={action} className="space-y-5">
      {state && state.ok === false && <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{state.error}</p>}
      {estimate && <input type="hidden" name="id" value={estimate.id} />}
      {asInvoice && <input type="hidden" name="create_invoice" value="true" />}
      <input type="hidden" name="items" value={itemsJson} />
      <input type="hidden" name="customer_id" value={estimate?.customerId ?? defaultCustomerId ?? ""} />

      <Card title="基本情報">
        <Grid>
          <F label="件名"><input name="title" defaultValue={estimate?.title ?? ""} className={inp} /></F>
          <F label="種別"><select name="kind" defaultValue={estimate?.kind ?? "funeral"} className={inp}><option value="funeral">葬儀見積</option><option value="pre">事前見積</option></select></F>
          {asInvoice ? <>
            <F label="請求日"><input name="billed_on" type="date" defaultValue={estimate?.estimateOn ?? ""} className={inp} /></F>
            <F label="お支払い期限"><input name="due_on" type="date" className={inp} /></F>
          </> : <>
            <F label="見積日"><input name="estimate_on" type="date" defaultValue={estimate?.estimateOn ?? ""} className={inp} /></F>
            <F label="有効期限"><input name="estimate_limit_on" type="date" defaultValue={estimate?.estimateLimitOn ?? ""} className={inp} /></F>
          </>}
        </Grid>
        <F label="摘要"><textarea name="memo" rows={2} defaultValue={estimate?.memo ?? ""} className={inp} /></F>
      </Card>

      <Card title="故人情報">
        <Grid>
          <F label="故人 氏"><input name="deceased_last_name" defaultValue={d.lastName ?? ""} className={inp} /></F>
          <F label="故人 名"><input name="deceased_first_name" defaultValue={d.firstName ?? ""} className={inp} /></F>
          <F label="セイ"><input name="deceased_last_name_kana" defaultValue={d.lastNameKana ?? ""} className={inp} /></F>
          <F label="メイ"><input name="deceased_first_name_kana" defaultValue={d.firstNameKana ?? ""} className={inp} /></F>
          <F label="性別"><select name="deceased_gender" defaultValue={d.gender ?? ""} className={inp}><option value="">選択</option>{GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}</select></F>
          <F label="享年"><input name="deceased_age" type="number" defaultValue={d.age ?? ""} className={inp} /></F>
          <F label="生年月日"><input name="deceased_birth_date" type="date" defaultValue={d.birthDate ?? ""} className={inp} /></F>
          <F label="没日"><input name="deceased_death_date" type="date" defaultValue={d.deathDate ?? ""} className={inp} /></F>
        </Grid>
      </Card>

      <Card title="喪主情報">
        <Grid>
          <F label="喪主 氏"><input name="mourner_last_name" defaultValue={mo.lastName ?? ""} className={inp} /></F>
          <F label="喪主 名"><input name="mourner_first_name" defaultValue={mo.firstName ?? ""} className={inp} /></F>
          <F label="カナ"><input name="mourner_kana" defaultValue={mo.kana ?? ""} className={inp} /></F>
          <F label="続柄"><input name="mourner_relation" defaultValue={mo.relation ?? ""} placeholder="長男 など" className={inp} /></F>
          <F label="電話"><input name="mourner_phone" defaultValue={mo.phone ?? ""} className={inp} /></F>
          <F label="郵便番号"><input name="mourner_postcode" defaultValue={mo.postcode ?? ""} className={inp} /></F>
          <F label="都道府県"><select name="mourner_prefecture" defaultValue={mo.prefecture ?? ""} className={inp}><option value="">選択</option>{PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}</select></F>
          <F label="市区町村"><input name="mourner_address_city" defaultValue={mo.addressCity ?? ""} className={inp} /></F>
          <F label="番地"><input name="mourner_address_street" defaultValue={mo.addressStreet ?? ""} className={inp} /></F>
          <F label="建物名"><input name="mourner_address_building" defaultValue={mo.addressBuilding ?? ""} className={inp} /></F>
        </Grid>
      </Card>

      <Card title="日程・会場">
        <Grid>
          <F label="宗教・宗旨"><input name="religion" defaultValue={estimate?.religion ?? ""} placeholder="仏式 など" className={inp} /></F>
          <F label="通夜"><input name="wake_at" type="datetime-local" defaultValue={toLocal(estimate?.wakeAt)} className={inp} /></F>
          <F label="葬儀・告別式"><input name="funeral_at" type="datetime-local" defaultValue={toLocal(estimate?.funeralAt)} className={inp} /></F>
          <F label="式場"><input name="venue_name" defaultValue={estimate?.venueName ?? ""} className={inp} /></F>
          <F label="式場住所"><input name="venue_address" defaultValue={estimate?.venueAddress ?? ""} className={inp} /></F>
          <F label="火葬場"><input name="crematorium_name" defaultValue={estimate?.crematoriumName ?? ""} className={inp} /></F>
        </Grid>
      </Card>

      <Card title="明細">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b text-xs text-gray-500">
              <tr>{["商品", "品名", "単価", "数量", "税率", "金額", ""].map((h) => <th key={h} className="px-1 py-2 text-left font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const amt = (r.lineKind === "discount" ? -Math.abs(r.unitPrice * r.quantity) : r.unitPrice * r.quantity) || 0;
                return (
                  <tr key={r.key} className="border-b">
                    <td className="px-1 py-1">
                      {r.lineKind === "item" ? (
                        <select value={r.productId} onChange={(e) => onPickProduct(r.key, e.target.value)} className={inp + " min-w-[120px]"}>
                          <option value="">自由入力</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      ) : <span className="text-xs text-gray-400">値引</span>}
                    </td>
                    <td className="px-1 py-1"><input value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} className={inp + " min-w-[140px]"} /></td>
                    <td className="px-1 py-1"><input type="number" value={r.unitPrice} onChange={(e) => update(r.key, { unitPrice: Number(e.target.value) })} className={inp + " w-24"} /></td>
                    <td className="px-1 py-1"><input type="number" value={r.quantity} onChange={(e) => update(r.key, { quantity: Number(e.target.value) })} className={inp + " w-16"} /></td>
                    <td className="px-1 py-1">
                      <select value={r.taxRate} onChange={(e) => update(r.key, { taxRate: Number(e.target.value) })} className={inp + " w-20"}>
                        <option value={0.1}>10%</option><option value={0.08}>8%</option><option value={0}>0%</option>
                      </select>
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap text-right">{amt.toLocaleString()}円</td>
                    <td className="px-1 py-1 text-right"><button type="button" onClick={() => removeRow(r.key)} className="text-xs text-red-500">×</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => addRow("item")} className="rounded border border-[#1aa39a] px-3 py-1.5 text-xs text-[#1aa39a]">＋ 商品行</button>
          <button type="button" onClick={() => addRow("discount")} className="rounded border border-gray-400 px-3 py-1.5 text-xs text-gray-600">＋ 値引行</button>
        </div>
        <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <TotalRow label="小計（税抜）" value={totals.subtotal} />
          <TotalRow label="値引" value={-totals.discount} />
          <TotalRow label="消費税" value={totals.tax} />
          <div className="flex justify-between border-t pt-2 text-base font-bold"><span>合計（税込）</span><span>{totals.total.toLocaleString()}円</span></div>
        </div>
      </Card>

      <Card title="その他">
        <Grid>
          <F label="前受金"><input name="advance_payment" type="number" defaultValue={estimate?.advancePayment ?? 0} className={inp} /></F>
          <F label="発行会社"><input name="issuer_company" className={inp} placeholder="株式会社 川口典礼" /></F>
          <F label="計上組織"><input name="charged_org" className={inp} /></F>
          <F label="計上担当者"><input name="charged_user" defaultValue="松澤 覚" className={inp} /></F>
        </Grid>
      </Card>

      <div className="flex gap-3 pb-16">
        <button disabled={pending} className="rounded bg-[#1aa39a] px-6 py-2.5 text-sm text-white disabled:opacity-60">{pending ? "保存中…" : asInvoice ? "登録する" : "見積を保存"}</button>
        <Link href={asInvoice ? "/kanri/billing" : "/kanri/estimates"} className="rounded border px-6 py-2.5 text-sm">キャンセル</Link>
      </div>

      {/* 右下 固定 合計バー（スマート葬儀準拠） */}
      <div className="fixed bottom-0 right-0 z-30 flex items-center gap-6 bg-[#f2683f] px-6 py-3 text-white shadow-lg">
        <span className="text-sm">合計（税込）</span>
        <span className="text-xl font-bold">{totals.total.toLocaleString()} 円</span>
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg bg-white p-5 shadow-sm"><p className="mb-3 font-bold text-[#1aa39a]">{title}</p>{children}</div>;
}
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>; }
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs text-gray-500">{label}</label><div className="mt-1">{children}</div></div>;
}
function TotalRow({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between text-gray-600"><span>{label}</span><span>{value.toLocaleString()}円</span></div>;
}
