"use client";
import { useState } from "react";
import Link from "next/link";
import { createPaymentSlip } from "@/lib/kanri/actions";

const SOURCES = ["現金支払", "銀行振込", "クレジットカード", "その他"];
const SLIP_KINDS = ["葬儀代", "供花供物代", "返礼品代", "その他"];
const HONORIFICS = ["様", "御中", "なし"];
const METHODS = ["現金", "振込", "カード", "相殺", "その他"];
const CATEGORIES = ["内金", "一部入金", "完納", "その他"];

interface Row { key: number }
export interface SlipPrefill {
  note: string; performanceNo?: string; addressee?: string;
  issuerCompany?: string; summary?: string; remaining: number; today: string;
}

export function PaymentSlipForm({ invoiceId, prefill }: { invoiceId: string; prefill: SlipPrefill }) {
  const { remaining, today, note: noteInit } = prefill;
  const [rows, setRows] = useState<Row[]>([{ key: 0 }]);
  const [note, setNote] = useState(noteInit ?? "");
  // 入金額の初期値: 1行目に残高をセット（入れられる内容は入れておく）
  const [amounts, setAmounts] = useState<Record<number, string>>({ 0: remaining > 0 ? String(remaining) : "" });
  let seq = rows.length;

  return (
    <form action={createPaymentSlip} className="rounded-lg bg-white p-6 shadow-sm">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <p className="mb-5 text-base font-bold text-[#2c8c6f]">伝票発行</p>

      <Field label="入金先"><Select name="source" options={SOURCES} /></Field>
      <Field label="伝票区分"><Select name="slip_kind" options={SLIP_KINDS} defaultValue="葬儀代" /></Field>
      <Field label="施行番号"><input name="performance_no" defaultValue={prefill.performanceNo ?? ""} className={inp} /></Field>
      <Field label="伝票番号"><input name="slip_no" className={inp} /><p className="mt-1 text-xs text-gray-400">空の場合は、自動採番されます</p></Field>
      <Field label="発行日"><input type="date" name="issued_on" defaultValue={today} className={inp} /></Field>
      <Field label="宛名"><input name="addressee" defaultValue={prefill.addressee ?? ""} className={inp} /></Field>
      <Field label="敬称"><select name="honorific" defaultValue="様" className={inp}>{HONORIFICS.map((h) => <option key={h} value={h === "なし" ? "" : h}>{h}</option>)}</select></Field>

      <div className="mb-4">
        <label className="mb-1 flex items-center gap-2 text-sm text-gray-600">但し書き
          <button type="button" onClick={() => setNote(prefill.note)} className="rounded border border-blue-400 px-2 py-0.5 text-xs text-blue-500">請求書の件名を反映</button>
        </label>
        <input name="note" value={note} onChange={(e) => setNote(e.target.value)} className={inp} />
      </div>

      <Field label="発行会社"><input name="issuer_company" defaultValue={prefill.issuerCompany ?? ""} className={inp} /></Field>
      <Field label="振込依頼名"><input name="transfer_name" className={inp} /></Field>
      <Field label="摘要"><input name="summary" defaultValue={prefill.summary ?? ""} className={inp} /></Field>
      <Field label="備考"><textarea name="remark" rows={4} className={inp} /></Field>

      {/* 入金額追加 */}
      <div className="mt-6 border-t pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold">入金額追加</p>
          <p className="text-sm text-gray-500">残高 {remaining.toLocaleString()} 円</p>
        </div>
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.key} className="rounded border border-gray-200 p-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 flex items-center gap-2 text-xs text-gray-500">入金額 <span className="text-red-500">必須</span>
                    <button type="button" onClick={() => setAmounts((a) => ({ ...a, [r.key]: String(remaining) }))} className="rounded bg-orange-400 px-2 py-0.5 text-[10px] text-white">現金をセット</button>
                  </label>
                  <input name="amount" inputMode="numeric" value={amounts[r.key] ?? ""} onChange={(e) => setAmounts((a) => ({ ...a, [r.key]: e.target.value }))} className={inp} />
                </div>
                <div><label className="mb-1 block text-xs text-gray-500">入金日 <span className="text-red-500">必須</span></label><input type="date" name="paid_on" defaultValue={today} className={inp} /></div>
                <div><label className="mb-1 block text-xs text-gray-500">入金方法</label><select name="method" defaultValue="現金" className={inp}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
                <div className="flex items-end gap-2">
                  <div className="flex-1"><label className="mb-1 block text-xs text-gray-500">入金種別</label><select name="category" defaultValue="" className={inp}><option value="">選択</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
                  {rows.length > 1 && <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="mb-0.5 rounded bg-red-500 px-3 py-2 text-xs text-white">削除</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setRows((rs) => [...rs, { key: (seq++, Math.max(0, ...rs.map((x) => x.key)) + 1) }])} className="mt-3 rounded bg-sky-400 px-3 py-1.5 text-xs text-white">入金を追加</button>
      </div>

      <div className="mt-6 flex gap-3">
        <button type="submit" className="rounded bg-[#2c8c6f] px-6 py-2.5 text-sm text-white">登録する</button>
        <Link href={`/kanri/billing/${invoiceId}`} className="rounded border px-6 py-2.5 text-sm">キャンセル</Link>
      </div>
    </form>
  );
}

const inp = "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#2c8c6f] focus:outline-none";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-4"><label className="mb-1 block text-sm text-gray-600">{label}</label>{children}</div>;
}
function Select({ name, options, defaultValue = "" }: { name: string; options: string[]; defaultValue?: string }) {
  return <select name={name} defaultValue={defaultValue} className={inp}><option value="">選択してください</option>{options.map((o) => <option key={o}>{o}</option>)}</select>;
}
