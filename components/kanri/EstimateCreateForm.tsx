"use client";
import { useMemo, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { saveEstimateFull, saveInvoiceFull, type KanriResult } from "@/lib/kanri/actions";
import { PREFECTURES } from "@/lib/kanri/constants";
import type { Product, ProductSet } from "@/lib/kanri/products";
import type { MasterItem } from "@/lib/kanri/master-defs";

// 実スマート葬儀の「見積もり作成」「請求書追加」フォーム準拠（両者ほぼ同一・請求は宛名→請求先情報）
interface Props {
  asInvoice?: boolean;
  products: Product[];
  productSets: ProductSet[];
  osonae: MasterItem[];      // その他オプション、お供えにかかる費用
  discounts: MasterItem[];   // 値引商品マスタ
}
interface OptRow { key: number; productId: string; name: string; unitPrice: number; quantity: number }
interface DiscRow { key: number; name: string; amount: number }
interface Hit { id: string; name: string; phone: string; address: string; birth: string }

let seq = 1;

export function EstimateCreateForm({ asInvoice, products, productSets, osonae, discounts }: Props) {
  const [state, action, pending] = useActionState<KanriResult | null, FormData>(asInvoice ? saveInvoiceFull : saveEstimateFull, null);
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [newCustomer, setNewCustomer] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [q, setQ] = useState(""); const [hits, setHits] = useState<Hit[]>([]); const [loading, setLoading] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [chosenSet, setChosenSet] = useState<ProductSet | null>(null);
  const [prodOpen, setProdOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [opts, setOpts] = useState<OptRow[]>([]);
  const [osonaeQty, setOsonaeQty] = useState<Record<string, number>>({});
  const [discRows, setDiscRows] = useState<DiscRow[]>([]);
  const [advance, setAdvance] = useState("");

  async function search() {
    setLoading(true);
    try { const res = await fetch(`/kanri/customers/search?q=${encodeURIComponent(q)}`); setHits(await res.json()); }
    finally { setLoading(false); }
  }
  function addOpt(p?: Product) {
    setOpts((rs) => [...rs, { key: seq++, productId: p?.id ?? "", name: p?.name ?? "", unitPrice: p?.unitPrice ?? 0, quantity: 1 }]);
  }
  function pickOptProduct(key: number, pid: string) {
    const p = products.find((x) => x.id === pid);
    setOpts((rs) => rs.map((r) => r.key === key ? { ...r, productId: pid, name: p?.name ?? r.name, unitPrice: p?.unitPrice ?? r.unitPrice } : r));
  }

  const totals = useMemo(() => {
    let ex = 0;
    if (chosenSet) ex += chosenSet.price;
    for (const r of opts) ex += r.unitPrice * r.quantity;
    for (const m of osonae) ex += (m.price ?? 0) * (osonaeQty[m.id] ?? 0);
    let disc = 0; for (const d of discRows) disc += Math.abs(d.amount);
    const tax = Math.round((ex - disc) * 0.1);
    return { ex, disc, tax, total: ex - disc + tax };
  }, [chosenSet, opts, osonae, osonaeQty, discRows]);

  const itemsJson = JSON.stringify([
    ...(chosenSet ? [{ lineKind: "item", name: chosenSet.name, unitPrice: chosenSet.price, quantity: 1, taxRate: chosenSet.tax, isSet: true }] : []),
    ...opts.filter((r) => r.name).map((r) => ({ lineKind: "item", productId: r.productId || null, name: r.name, unitPrice: r.unitPrice, quantity: r.quantity, taxRate: 0.1 })),
    ...osonae.filter((m) => (osonaeQty[m.id] ?? 0) > 0).map((m) => ({ lineKind: "item", name: m.name, unitPrice: m.price ?? 0, quantity: osonaeQty[m.id], taxRate: 0.1, isOsonae: true })),
    ...discRows.filter((d) => d.name).map((d) => ({ lineKind: "discount", name: d.name, unitPrice: Math.abs(d.amount), quantity: 1, taxRate: 0.1 })),
  ]);

  const inp = "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#2c8c6f] focus:outline-none";
  const label = asInvoice ? "請求先情報" : "宛名情報";

  return (
    <form action={action} className="space-y-4 pb-20">
      {state && state.ok === false && <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{state.error}</p>}
      <input type="hidden" name="items" value={itemsJson} />
      <input type="hidden" name="customer_id" value={customer?.id ?? ""} />
      <input type="hidden" name="product_set_id" value={chosenSet?.id ?? ""} />
      <input type="hidden" name="product_set_price" value={chosenSet?.price ?? 0} />
      <input type="hidden" name="advance_payment" value={advance || "0"} />

      {/* 施行番号 */}
      <Card>
        <F label="施行番号">
          <div className="flex gap-2">
            <input name="construction_no" className={inp} />
            <button type="button" className="whitespace-nowrap rounded border px-3 py-2 text-xs text-gray-600">施行番号から<br />対象者情報を読込む</button>
          </div>
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
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <F label="顧客氏"><input name="new_customer_last_name" className={inp} /></F>
            <F label="顧客名"><input name="new_customer_first_name" className={inp} /></F>
          </div>
        )}
        <div className="mt-3"><F label="対象者"><input name="deceased_name" className={inp} placeholder="対象者（故人）氏名" /></F></div>
      </Card>

      {/* 宛名情報 / 請求先情報 */}
      <Card title={label}>
        <F label={label}>
          <select name="addressee_kind" defaultValue="喪主" className={inp}><option>喪主</option><option>顧客</option><option>その他</option></select>
        </F>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_90px]">
          <F label={asInvoice ? "請求先名(氏)" : "宛名(氏)"}><input name="addressee_last_name" className={inp} /><p className="mt-0.5 text-[11px] text-gray-400">企業名などはこちらに入力してください</p></F>
          <F label={asInvoice ? "請求先名(名)" : "宛名(名)"}><input name="addressee_first_name" className={inp} /></F>
          <F label="敬称"><select name="addressee_honorific" defaultValue="様" className={inp}><option>様</option><option>御中</option><option value="">なし</option></select></F>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <F label={asInvoice ? "請求先名カナ(氏)" : "宛名カナ(氏)"}><input name="addressee_last_name_kana" className={inp} /></F>
          <F label={asInvoice ? "請求先名カナ(名)" : "宛名カナ(名)"}><input name="addressee_first_name_kana" className={inp} /></F>
        </div>
        <div className="mt-3"><F label="郵便番号"><input name="addressee_postcode" className={inp} placeholder="ハイフン(-)無しで入力してください" /></F></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <F label="都道府県"><select name="addressee_prefecture" className={inp}><option value="">選択</option>{PREFECTURES.map((p) => <option key={p}>{p}</option>)}</select></F>
          <F label="市区町村"><input name="addressee_address_city" className={inp} /></F>
          <F label="番地"><input name="addressee_address_street" className={inp} /></F>
          <F label="建物名など"><input name="addressee_address_building" className={inp} /></F>
        </div>
      </Card>

      {/* 件名・摘要・日付 */}
      <Card>
        <F label="件名" required><input name="title" required className={inp} /></F>
        <div className="mt-3"><F label="摘要"><input name="memo" className={inp} /></F></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {asInvoice ? (<>
            <F label="請求日" required><input type="date" name="billed_on" required className={inp} /></F>
            <F label="お支払い期限"><input type="date" name="due_on" className={inp} /></F>
          </>) : (<>
            <F label="見積日"><input type="date" name="estimate_on" className={inp} /></F>
            <F label="見積有効期限"><input type="date" name="estimate_limit_on" className={inp} /></F>
          </>)}
        </div>
        <div className="mt-3"><F label="火葬場"><input name="crematorium_name" className={inp} /></F></div>
        <div className="mt-3"><F label="ブランド"><select name="brand" className={inp}><option value=""></option><option>川口典礼</option></select></F></div>
        <div className="mt-3"><F label="在庫管理会場"><input name="stock_venue" className={inp} /></F></div>
      </Card>

      {/* セット商品 */}
      <Card title="セット商品">
        {chosenSet ? (
          <div className="flex items-center justify-between rounded border border-[#2c8c6f] bg-[#f0faf8] px-4 py-3 text-sm">
            <div><p className="font-bold">{chosenSet.name}</p><p className="text-xs text-gray-500">セット価格(税抜) {chosenSet.price.toLocaleString()}円 / (税込) {chosenSet.taxIncludedPrice.toLocaleString()}円</p></div>
            <button type="button" onClick={() => setChosenSet(null)} className="rounded border border-red-400 px-3 py-1 text-xs text-red-500">解除</button>
          </div>
        ) : <p className="text-sm text-red-400">設定されていません</p>}
        <button type="button" onClick={() => setSetOpen(true)} className="mt-2 rounded bg-sky-400 px-3 py-1.5 text-xs text-white">セット商品選択</button>
      </Card>

      {/* オプション */}
      <Card title="オプション">
        {opts.length > 0 && (
          <div className="mb-2 space-y-2">
            {opts.map((r) => (
              <div key={r.key} className="flex items-center gap-2">
                <select value={r.productId} onChange={(e) => pickOptProduct(r.key, e.target.value)} className={inp + " flex-1"}>
                  <option value="">商品を選択</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}（{p.unitPrice.toLocaleString()}円）</option>)}
                </select>
                <input type="number" value={r.unitPrice} onChange={(e) => setOpts((rs) => rs.map((x) => x.key === r.key ? { ...x, unitPrice: Number(e.target.value) || 0 } : x))} className="w-28 rounded border border-gray-300 px-2 py-2 text-sm text-right" />
                <input type="number" value={r.quantity} onChange={(e) => setOpts((rs) => rs.map((x) => x.key === r.key ? { ...x, quantity: Number(e.target.value) || 1 } : x))} className="w-16 rounded border border-gray-300 px-2 py-2 text-sm text-center" />
                <button type="button" onClick={() => setOpts((rs) => rs.filter((x) => x.key !== r.key))} className="rounded bg-red-500 px-2 py-1.5 text-xs text-white">削除</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => addOpt()} className="rounded bg-sky-400 px-3 py-1.5 text-xs text-white">オプション追加</button>
          <button type="button" onClick={() => { setProdOpen(true); setChecked(new Set()); }} className="rounded border border-sky-400 px-3 py-1.5 text-xs text-sky-500">☰ 商品を連続して追加</button>
        </div>
      </Card>

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

      {/* 前受金・発行情報 */}
      <Card>
        <F label="前受金"><input type="number" value={advance} onChange={(e) => setAdvance(e.target.value)} className={inp} /></F>
        <div className="mt-3"><F label="発行会社"><input name="issuer_company" defaultValue="株式会社 川口典礼" className={inp} /></F></div>
        <div className="mt-3"><F label="計上組織"><input name="charged_org" className={inp} /></F></div>
        <div className="mt-3"><F label="計上担当者"><input name="charged_user" defaultValue="松澤 覚" className={inp} /></F></div>
      </Card>

      <div className="flex gap-3">
        <button disabled={pending || !customer && !newCustomer} className="rounded bg-[#2c8c6f] px-6 py-2.5 text-sm text-white disabled:opacity-50">{pending ? "保存中…" : "登録する"}</button>
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
                    <td className="px-3 py-2"><button type="button" onClick={() => { setChosenSet(s); setSetOpen(false); }} className="rounded border border-blue-400 px-3 py-1 text-xs text-blue-500">選択</button></td>
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
