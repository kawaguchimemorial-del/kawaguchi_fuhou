"use client";
import { useMemo, useState } from "react";
import type { CeremonyListItem } from "@/lib/admin/data";
import { CeremonyRow } from "@/components/admin/CeremonyRow";

// 葬儀一覧（検索・顧客名列付き）。喪主名/故人名/顧客名で横断検索できる。
export function CeremonyList({ rows }: { rows: CeremonyListItem[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const norm = (s?: string) => (s ?? "").replace(/[\s　]/g, "");
  const filtered = useMemo(() => {
    const k = norm(q);
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (!k) return true;
      return [r.mournerName, r.deceasedName, r.customerName].some((v) => norm(v).includes(k));
    });
  }, [rows, q, status]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-white p-4 text-sm shadow-sm">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="喪主名・故人名・顧客名で検索" className="min-w-[240px] flex-1 rounded border px-3 py-2" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border px-3 py-2">
          <option value="">ステータス（全て）</option>
          <option value="公開中">公開中</option>
          <option value="下書き">下書き</option>
          <option value="終了">終了</option>
        </select>
        <span className="text-xs text-gray-500">{filtered.length} 件</span>
      </div>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600">
            <tr>
              {["", "顧客名", "喪主名", "故人名", "式1", "式2", "オンライン会場公開期間", "注文受付終了", "ステータス"].map((h, i) => (
                <th key={i} className="px-3 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-10 text-center text-gray-400">該当する葬儀がありません。</td></tr>
            ) : filtered.map((r) => <CeremonyRow key={r.id} r={r} />)}
          </tbody>
        </table>
      </div>
    </>
  );
}
