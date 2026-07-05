"use client";
import { useActionState } from "react";
import { saveCompanyInfo, type KanriResult } from "@/lib/kanri/actions";
import { COMPANY_FIELDS } from "@/lib/kanri/master-defs";

export function CompanyForm({ values }: { values: Record<string, string> }) {
  const [state, action, pending] = useActionState<KanriResult | null, FormData>(saveCompanyInfo, null);
  const inp = "mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#1aa39a] focus:outline-none";
  return (
    <form action={action} className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
      {state && state.ok && <p className="rounded bg-green-50 px-4 py-2 text-sm text-green-700">保存しました。</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {COMPANY_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-sm text-gray-600">{f.label}</label>
            <input name={`f_${f.key}`} defaultValue={values[f.key] ?? ""} className={inp} />
          </div>
        ))}
      </div>
      <button disabled={pending} className="rounded bg-[#1aa39a] px-6 py-2.5 text-sm text-white disabled:opacity-60">{pending ? "保存中…" : "保存する"}</button>
    </form>
  );
}
