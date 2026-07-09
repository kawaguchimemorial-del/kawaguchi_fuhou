"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Hit = { id: string; name: string; phone: string; address: string };
type Est = { id: string; estimateNo: string; deceased: string; title: string; on: string };

export function PortraitStartForm() {
  const router = useRouter();
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [deceased, setDeceased] = useState("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  // 見積(施行)ピッカー
  const [estimates, setEstimates] = useState<Est[]>([]);
  const [estimate, setEstimate] = useState<Est | null>(null);

  async function search() {
    setLoading(true);
    try {
      const res = await fetch(`/kanri/customers/search?q=${encodeURIComponent(q)}`);
      setHits(await res.json());
    } finally { setLoading(false); }
  }
  async function selectCustomer(c: { id: string; name: string }) {
    setCustomer(c); setOpen(false); setEstimate(null);
    try {
      const res = await fetch(`/kanri/estimates/for-customer?customer_id=${c.id}`);
      setEstimates(await res.json());
    } catch { setEstimates([]); }
  }
  function pickEstimate(e: Est) {
    setEstimate(e);
    if (e.deceased) setDeceased(e.deceased); // 表記ゆれ防止で見積の対象者名を採用
  }
  function start() {
    const params = new URLSearchParams();
    if (customer) { params.set("customer_id", customer.id); params.set("customer_name", customer.name); }
    if (estimate) params.set("estimate_id", estimate.id);
    if (deceased.trim()) params.set("deceased", deceased.trim());
    router.push(`/iei-photo?${params.toString()}`);
  }
  const inp = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-[#2c8c6f] focus:outline-none";
  const canStart = !!customer || !!deceased.trim();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">AI遺影写真を作成</h1>
        <Link href="/kanri/ai-portrait" className="rounded border px-3 py-1.5 text-sm">← 一覧へ</Link>
      </div>
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm text-gray-500">誰の遺影写真を作成するか登録してください。顧客と対象者を紐づけると、一覧やオンライン式場で対応づけできます。</p>

        {/* 顧客 */}
        <label className="block text-sm font-medium text-gray-700">顧客</label>
        <div className="mt-1 flex gap-2">
          <input readOnly value={customer?.name ?? ""} placeholder="未選択" className={inp} />
          <button type="button" onClick={() => { setOpen(true); setHits([]); setQ(""); }} className="shrink-0 rounded-lg border border-[#2bb8ae] px-4 text-sm text-[#2bb8ae]">選択</button>
        </div>

        {/* 見積(施行)選択: 顧客の見積があれば施行を選ぶと父/母などを一意に区別できる */}
        {customer && estimates.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">施行（見積）<span className="ml-1 text-xs font-normal text-gray-400">同姓同名・父母別葬儀を区別するため推奨</span></label>
            <div className="mt-1 divide-y rounded-lg border border-gray-200">
              {estimates.map((e) => (
                <button key={e.id} type="button" onClick={() => pickEstimate(e)} className={"flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-gray-50 " + (estimate?.id === e.id ? "bg-[#e6f6f4]" : "")}>
                  <span className="min-w-0">
                    <span className="font-medium text-gray-800">{e.deceased || "（対象者未設定）"}</span>
                    <span className="ml-2 text-xs text-gray-400">{[e.estimateNo && `施行No.${e.estimateNo}`, e.title].filter(Boolean).join(" / ")}</span>
                  </span>
                  {estimate?.id === e.id && <span className="shrink-0 text-xs font-bold text-[#2c8c6f]">選択中</span>}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">※ 施行を選ぶと対象者名が自動入力され、オンライン式場の祭壇に正確に反映できます。</p>
          </div>
        )}

        {/* 対象者名 */}
        <label className="mt-4 block text-sm font-medium text-gray-700">対象者（故人）名</label>
        <input value={deceased} onChange={(e) => setDeceased(e.target.value)} placeholder="例：川口 太郎" className={inp + " mt-1"} />

        <button type="button" onClick={start} disabled={!canStart} className="mt-6 w-full rounded-lg bg-[#2c8c6f] py-3 text-base font-bold text-white disabled:opacity-40">
          作成を開始する →
        </button>
        {!canStart && <p className="mt-2 text-center text-xs text-gray-400">顧客の選択か対象者名の入力が必要です</p>}
      </div>

      {/* 顧客ピッカー */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6" onClick={() => setOpen(false)}>
          <div className="mt-14 w-full max-w-lg rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><p className="font-bold text-gray-800">顧客を選択</p><button onClick={() => setOpen(false)} className="text-gray-400">×</button></div>
            <div className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} placeholder="氏名/カナ/電話/メール/顧客番号" className={inp} />
              <button type="button" onClick={search} className="shrink-0 rounded-lg bg-[#5b6ee1] px-5 text-sm text-white">検索</button>
            </div>
            <div className="mt-3 max-h-80 overflow-y-auto">
              {loading ? <p className="py-6 text-center text-sm text-gray-400">検索中…</p> : hits.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">キーワードで検索してください。</p> : (
                <ul className="divide-y">
                  {hits.map((h) => (
                    <li key={h.id}>
                      <button type="button" onClick={() => selectCustomer({ id: h.id, name: h.name })} className="flex w-full flex-col items-start gap-0.5 px-2 py-3 text-left hover:bg-gray-50">
                        <span className="font-medium text-gray-800">{h.name || "（無名）"}</span>
                        <span className="text-xs text-gray-400">{[h.phone, h.address].filter(Boolean).join(" / ")}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
