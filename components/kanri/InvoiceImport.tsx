"use client";
import { useState } from "react";
import Link from "next/link";
import { importInvoices } from "@/lib/kanri/actions";

export function InvoiceImport() {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const r = new FileReader();
    r.onload = () => setCsv(String(r.result ?? ""));
    r.readAsText(f, "UTF-8");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-4 font-bold text-gray-800">CSVインポート</p>
        <form action={importInvoices}>
          <input type="hidden" name="csv" value={csv} />
          <label className="mb-1 block text-sm text-gray-600">CSVファイル <span className="rounded bg-orange-400 px-1.5 py-0.5 text-[10px] text-white">必須</span></label>
          <div className="mb-4 flex items-center gap-3">
            <label className="cursor-pointer rounded border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm">ファイルを選択
              <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
            </label>
            <span className="text-sm text-gray-500">{fileName || "選択されていません"}</span>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={!csv} className="rounded bg-[#2c8c6f] px-6 py-2.5 text-sm text-white disabled:opacity-50">登録する</button>
            <Link href="/kanri/billing" className="rounded border px-6 py-2.5 text-sm">キャンセル</Link>
          </div>
        </form>
      </div>

      <div className="rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-4 font-bold text-gray-800">CSVインポート用フォーマットダウンロード</p>
        <a href="/kanri/billing/import/format" className="inline-block rounded bg-[#2c8c6f] px-6 py-2.5 text-sm text-white">ダウンロード</a>
      </div>
    </div>
  );
}
