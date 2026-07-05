"use client";
import { useActionState } from "react";
import Link from "next/link";
import { createCustomer, updateCustomer, type KanriResult } from "@/lib/kanri/actions";
import { CUSTOMER_STATUSES, INFLOWS, GENDERS, PREFECTURES } from "@/lib/kanri/constants";
import type { Customer } from "@/lib/kanri/data";

const years = Array.from({ length: 125 }, (_, i) => 1900 + i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);
const days = Array.from({ length: 31 }, (_, i) => i + 1);

export function CustomerForm({ customer }: { customer?: Customer }) {
  const editing = !!customer;
  const [state, action, pending] = useActionState<KanriResult | null, FormData>(editing ? updateCustomer : createCustomer, null);
  const c = customer;
  const bd = c?.birthDate ? c.birthDate.split("-") : [];
  return (
    <form action={action} className="space-y-6 rounded-lg bg-white p-6 shadow-sm">
      {state && state.ok === false && <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{state.error}</p>}
      {editing && <input type="hidden" name="id" value={c!.id} />}

      <Grid>
        <Field label="顧客氏" required><input name="last_name" required defaultValue={c?.lastName ?? ""} className={inp} /></Field>
        <Field label="顧客名"><input name="first_name" defaultValue={c?.firstName ?? ""} className={inp} /></Field>
        <Field label="顧客セイ"><input name="last_name_kana" defaultValue={c?.lastNameKana ?? ""} className={inp} /></Field>
        <Field label="顧客メイ"><input name="first_name_kana" defaultValue={c?.firstNameKana ?? ""} className={inp} /></Field>
        <Field label="ステータス">
          <select name="status" className={inp} defaultValue={c?.status ?? "問い合わせ"}>
            <option value="">選択してください</option>
            {CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="流入経路">
          <select name="inflow" className={inp} defaultValue={c?.inflow ?? ""}><option value="">選択してください</option>{INFLOWS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        </Field>
        <Field label="顧客担当"><input name="staff_name" defaultValue={c?.staffName ?? "松澤 覚"} className={inp} /></Field>
        <Field label="性別">
          <select name="gender" className={inp} defaultValue={c?.gender ?? ""}><option value="">選択</option>{GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}</select>
        </Field>
      </Grid>

      <Field label="生年月日">
        <div className="flex gap-2">
          <select name="birth_y" className={inp} defaultValue={bd[0] ?? ""}><option value="">年</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
          <select name="birth_m" className={inp} defaultValue={bd[1] ? String(Number(bd[1])) : ""}><option value="">月</option>{months.map((m) => <option key={m} value={m}>{m}月</option>)}</select>
          <select name="birth_d" className={inp} defaultValue={bd[2] ? String(Number(bd[2])) : ""}><option value="">日</option>{days.map((d) => <option key={d} value={d}>{d}日</option>)}</select>
        </div>
      </Field>

      <Grid>
        <Field label="自宅番号"><input name="telephone_number" defaultValue={c?.telephoneNumber ?? ""} className={inp} placeholder="ハイフン無し" /></Field>
        <Field label="携帯番号"><input name="mobile_number" defaultValue={c?.mobileNumber ?? ""} className={inp} placeholder="ハイフン無し" /></Field>
        <Field label="FAX番号"><input name="fax_number" defaultValue={c?.faxNumber ?? ""} className={inp} /></Field>
        <Field label="メールアドレス"><input name="email" type="email" defaultValue={c?.email ?? ""} className={inp} /></Field>
      </Grid>

      <div className="flex flex-wrap gap-6 text-sm">
        <Check name="available_sms_auto_sent" label="SMS自動配信対象にする" defaultChecked={c ? c.availableSmsAutoSent : true} />
        <Check name="available_dm_send" label="ダイレクトメールを受け取る" defaultChecked={c ? c.availableDmSend : true} />
        <Check name="available_mail_magazine" label="メルマガを受け取る" defaultChecked={c ? c.availableMailMagazine : false} />
      </div>

      <Grid>
        <Field label="郵便番号"><input name="postcode" defaultValue={c?.postcode ?? ""} className={inp} placeholder="ハイフン無し" /></Field>
        <Field label="都道府県">
          <select name="prefecture_code" className={inp} defaultValue={c?.prefectureCode ?? ""}><option value="">選択</option>{PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}</select>
        </Field>
        <Field label="市区町村"><input name="address_city" defaultValue={c?.addressCity ?? ""} className={inp} /></Field>
        <Field label="番地"><input name="address_street" defaultValue={c?.addressStreet ?? ""} className={inp} /></Field>
        <Field label="建物名など"><input name="address_building" defaultValue={c?.addressBuilding ?? ""} className={inp} /></Field>
        <Field label="顧客ランク"><input name="rank" defaultValue={c?.rank ?? ""} className={inp} /></Field>
        <Field label="顧客番号"><input name="customer_no" defaultValue={c?.customerNo ?? ""} className={inp} placeholder="空の場合、自動で採番されます" /></Field>
      </Grid>

      <Field label="その他備考"><textarea name="note" rows={3} defaultValue={c?.note ?? ""} className={inp} /></Field>
      <Field label="問い合わせ理由"><textarea name="reason" rows={3} defaultValue={c?.reason ?? ""} className={inp} /></Field>

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="rounded bg-[#1aa39a] px-6 py-2.5 text-sm text-white disabled:opacity-60">{pending ? "保存中…" : editing ? "更新する" : "登録する"}</button>
        <Link href={editing ? `/kanri/customers/${c!.id}` : "/kanri/customers"} className="rounded border px-6 py-2.5 text-sm">キャンセル</Link>
      </div>
    </form>
  );
}

const inp = "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#1aa39a] focus:outline-none";

function Grid({ children }: { children: React.ReactNode }) { return <div className="grid gap-4 sm:grid-cols-2">{children}</div>; }
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (<div><label className="block text-sm text-gray-600">{label}{required && <span className="ml-1 text-xs text-red-500">必須</span>}</label><div className="mt-1">{children}</div></div>);
}
function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (<label className="flex items-center gap-2"><input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" />{label}</label>);
}
