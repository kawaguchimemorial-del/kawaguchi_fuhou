"use client";
import { useState } from "react";
import Link from "next/link";
import { addRelatedCustomer, deleteRelatedCustomer } from "@/lib/kanri/actions";

interface Link0 { id: string; relation?: string; customer: { id: string; name: string } }
interface Hit { id: string; name: string; phone: string; address: string; birth: string }

export function RelatedCustomers({ customerId, links }: { customerId: string; links: Link0[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const [relation, setRelation] = useState("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    try {
      const res = await fetch(`/kanri/customers/search?q=${encodeURIComponent(q)}&exclude=${customerId}`);
      setHits(await res.json());
    } finally { setLoading(false); }
  }

  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-bold text-gray-800">関連顧客</p>
        <button onClick={() => { setAddOpen(true); setPicked(null); setRelation(""); }} className="rounded border border-blue-400 px-3 py-1 text-xs text-blue-500">＋ 関連追加</button>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50 text-xs text-gray-500"><tr>{["氏名", "関連", ""].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
        <tbody className="divide-y">
          {links.length === 0 ? <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400">該当なし</td></tr> :
            links.map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-3"><Link href={`/kanri/customers/${l.customer.id}`} className="text-[#1aa39a] underline">{l.customer.name}</Link></td>
                <td className="px-3 py-3 text-gray-600">{l.relation ?? "—"}</td>
                <td className="px-3 py-3 text-right"><form action={deleteRelatedCustomer}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="customer_id" value={customerId} /><button className="rounded bg-red-500 px-2 py-1 text-[11px] text-white">削除</button></form></td>
              </tr>
            ))}
        </tbody>
      </table>

      {/* 関連顧客モーダル */}
      {addOpen && (
        <Modal title="関連顧客" onClose={() => setAddOpen(false)}>
          <form action={addRelatedCustomer}>
            <input type="hidden" name="customer_id" value={customerId} />
            <input type="hidden" name="related_customer_id" value={picked?.id ?? ""} />
            <label className="mb-1 block text-sm text-gray-600">関連顧客 <span className="rounded bg-orange-400 px-1.5 py-0.5 text-[10px] text-white">必須</span></label>
            <div className="mb-4 flex gap-2">
              <input readOnly value={picked?.name ?? ""} placeholder="未選択" className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm" />
              <button type="button" onClick={() => { setPickOpen(true); setHits([]); setQ(""); }} className="rounded border border-[#2bb8ae] px-4 py-2 text-sm text-[#2bb8ae]">選択</button>
            </div>
            <label className="mb-1 block text-sm text-gray-600">関連 <span className="rounded bg-orange-400 px-1.5 py-0.5 text-[10px] text-white">必須</span></label>
            <input name="relation" value={relation} onChange={(e) => setRelation(e.target.value)} required className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="続柄など（例: 妻・長男）" />
            <div className="text-right"><button type="submit" disabled={!picked} className="rounded bg-[#5b6ee1] px-5 py-2 text-sm text-white disabled:opacity-50">登録する</button></div>
          </form>
        </Modal>
      )}

      {/* 顧客ピッカー */}
      {pickOpen && (
        <Modal title="顧客を選択してください。" onClose={() => setPickOpen(false)} wide>
          <div className="rounded-lg bg-gray-50 p-4">
            <label className="mb-1 block text-xs text-gray-500">キーワード（氏名/カナ/電話/メール/顧客番号）</label>
            <div className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm" />
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
                        <td className="px-3 py-2"><button type="button" onClick={() => { setPicked({ id: h.id, name: h.name }); setPickOpen(false); }} className="rounded border border-blue-400 px-3 py-1 text-xs text-blue-500">選択</button></td>
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
    </div>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
      <div className={"mt-16 w-full rounded-lg bg-white p-6 shadow-xl " + (wide ? "max-w-3xl" : "max-w-lg")}>
        <div className="mb-4 flex items-center justify-between">
          <p className="font-bold text-gray-800">{title}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
