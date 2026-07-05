"use client";
import { useState } from "react";
import { useActionState } from "react";
import { importProducts, type KanriResult } from "@/lib/kanri/actions";

function parseCsv(text: string): Record<string, string>[] {
  const t = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let cur: string[] = [], field = "", inQ = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQ) { if (ch === '"') { if (t[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += ch; }
    else { if (ch === '"') inQ = true; else if (ch === ",") { cur.push(field); field = ""; } else if (ch === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; } else if (ch === "\r") { } else field += ch; }
  }
  if (field !== "" || cur.length) { cur.push(field); rows.push(cur); }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((v) => v.trim() !== "")).map((r) => { const o: Record<string, string> = {}; header.forEach((h, i) => { o[h] = (r[i] ?? "").trim(); }); return o; });
}

export function ProductImport() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [state, action, pending] = useActionState<KanriResult | null, FormData>(importProducts, null);
  async function onFile(f: File | null) { if (!f) return; setFileName(f.name); setRows(parseCsv(await f.text())); }
  return (
    <div className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
      {state && state.ok === false && <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{state.error}</p>}
      <p className="text-sm text-gray-600">商品CSVを取り込みます。1行目はヘッダー（商品種別／商品名／カナ／単価／原価／税率／単位／発注先／備考）。</p>
      <a href="/kanri/products/export" className="text-sm text-[#1aa39a] underline">フォーマット（現在の商品CSV）をダウンロード</a>
      <div><input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="text-sm" /></div>
      {fileName && <p className="text-xs text-gray-500">{fileName} — 取り込み対象 {rows.length} 件</p>}
      {rows.length > 0 && (
        <div className="max-h-64 overflow-auto rounded border text-xs">
          <table className="w-full text-left"><thead className="bg-gray-50"><tr>{Object.keys(rows[0]).slice(0, 8).map((h) => <th key={h} className="px-2 py-1 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y">{rows.slice(0, 20).map((r, i) => <tr key={i}>{Object.keys(rows[0]).slice(0, 8).map((h) => <td key={h} className="px-2 py-1">{r[h]}</td>)}</tr>)}</tbody></table>
        </div>
      )}
      <form action={action}><input type="hidden" name="rows" value={JSON.stringify(rows)} />
        <button disabled={pending || rows.length === 0} className="rounded bg-[#1aa39a] px-6 py-2.5 text-sm text-white disabled:opacity-50">{pending ? "取り込み中…" : `${rows.length} 件を取り込む`}</button>
      </form>
    </div>
  );
}
