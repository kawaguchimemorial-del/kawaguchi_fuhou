"use client";
import { useActionState } from "react";
import Link from "next/link";
import { createCustomer, type KanriResult } from "@/lib/kanri/actions";
import { CUSTOMER_STATUSES, INFLOWS, GENDERS, PREFECTURES } from "@/lib/kanri/constants";

const years = Array.from({ length: 125 }, (_, i) => 1900 + i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);
const days = Array.from({ length: 31 }, (_, i) => i + 1);

export function CustomerForm() {
  const [state, action, pending] = useActionState<KanriResult | null, FormData>(createCustomer, null);
  return (
    <form action={action} className="space-y-6 rounded-lg bg-white p-6 shadow-sm">
      {state && state.ok === false && (
        <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <Grid>
        <Field label="顧客氏" required><input name="last_name" required className={inp} /></Field>
        <Field label="顧客名"><input name="first_name" className={inp} /></Field>
        <Field label="顧客セイ"><input name="last_name_kana" className={inp} /></Field>
        <Field label="顧客メイ"><input name="first_name_kana" className={inp} /></Field>
        <Field label="ステータス">
          <select name="status" className={inp} defaultValue="問い合わせ">
            <option value="">選択してください</option>
            {CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="流入経路">
          <select name="inflow" className={inp}><option value="">選択してください</option>{INFLOWS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        </Field>
        <Field label="顧客担当"><input name="staff_name" defaultValue="松澤 覚" className={inp} /></Field>
        <Field label="性別">
          <select name="gender" className={inp}><option value="">選択</option>{GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}</select>
        </Field>
      </Grid>

      <Field label="生年月日">
        <div className="flex gap-2">
          <select name="birth_y" className={inp}><option value="">年</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
          <select name="birth_m" className={inp}><option value="">月</option>{months.map((m) => <option key={m} value={m}>{m}月</option>)}</select>
          <select name="birth_d" className={inp}><option value="">日</option>{days.map((d) => <option key={d} value={d}>{d}日</option>)}</select>
        </div>
      </Field>

      <Grid>
        <Field label="自宅番号"><input name="telephone_number" className={inp} placeholder="ハイフン無し" /></Field>
        <Field label="携帯番号"><input name="mobile_number" className={inp} placeholder="ハイフン無し" /></Field>
        <Field label="FAX番号"><input name="fax_number" className={inp} /></Field>
        <Field label="メールアドレス"><input name="email" type="email" className={inp} /></Field>
      </Grid>

      <div className="flex flex-wrap gap-6 text-sm">
        <Check name="available_sms_auto_sent" label="SMS自動配信対象にする" defaultChecked />
        <Check name="available_dm_send" label="ダイレクトメールを受け取る" defaultChecked />
        <Check name="available_mail_magazine" label="メルマガを受け取る" />
      </div>

      <Grid>
        <Field label="郵便番号"><input name="postcode" className={inp} placeholder="ハイフン無し" /></Field>
        <Field label="都道府県">
          <select name="prefecture_code" className={inp}><option value="">選択</option>{PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}</select>
        </Field>
        <Field label="市区町村"><input name="address_city" className={inp} /></Field>
        <Field label="番地"><input name="address_street" className={inp} /></Field>
        <Field label="建物名など"><input name="address_building" className={inp} /></Field>
        <Field label="顧客ランク"><input name="rank" className={inp} /></Field>
        <Field label="顧客番号"><input name="customer_no" className={inp} placeholder="空の場合そのまま" /></Field>
      </Grid>

      <Field label="その他備考"><textarea name="note" rows={3} className={inp} /></Field>
      <Field label="問い合わせ理由"><textarea name="reason" rows={3} className={inp} /></Field>

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="rounded bg-[#1aa39a] px-6 py-2.5 text-sm text-white disabled:opacity-60">{pending ? "登録中…" : "登録する"}</button>
        <Link href="/kanri/customers" className="rounded border px-6 py-2.5 text-sm">キャンセル</Link>
      </div>
    </form>
  );
}

const inp = "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#1aa39a] focus:outline-none";

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-600">{label}{required && <span className="ml-1 text-xs text-red-500">必須</span>}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" />
      {label}
    </label>
  );
}
