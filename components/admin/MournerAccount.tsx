"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueMournerAccount, type IssueResult } from "@/lib/admin/mourner-actions";

export function MournerAccount({
  slug,
  issued,
  loginId,
  defaultMethod = "phone",
  defaultPhone = "",
  defaultEmail = "",
}: {
  slug: string;
  issued: boolean;
  loginId: string | null;
  defaultMethod?: "phone" | "email";
  defaultPhone?: string;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"phone" | "email">(defaultMethod);
  const [contact, setContact] = useState(defaultMethod === "email" ? defaultEmail : defaultPhone);
  // 発行方法の切替時、未入力/既定値のままなら対応する既定値(電話/メール)を自動入力
  const pickMethod = (m: "phone" | "email") => {
    setMethod(m);
    if (contact === "" || contact === defaultPhone || contact === defaultEmail) {
      setContact(m === "phone" ? defaultPhone : defaultEmail);
    }
  };
  const [result, setResult] = useState<IssueResult | null>(null);
  const [pending, start] = useTransition();

  // 発行済み表示
  if (issued && !result) {
    return (
      <div className="mb-6 rounded bg-green-50 px-4 py-3 text-sm text-green-800">
        ✅ 喪主アカウント発行済み（ログインID：<span className="font-mono font-medium">{loginId}</span>）
        <a
          href={`/mypage/sign-in${loginId ? `?id=${encodeURIComponent(loginId)}` : ""}`}
          target="_blank"
          rel="noreferrer"
          className="ml-2 underline"
        >
          マイページを開く
        </a>
      </div>
    );
  }

  // 発行直後の認証情報表示
  if (result?.ok) {
    return (
      <div className="mb-6 rounded border border-green-300 bg-green-50 px-4 py-4 text-sm">
        <p className="font-bold text-green-800">喪主アカウントを発行しました。</p>
        <p className="mt-2">ログインID：<span className="font-mono font-medium">{result.loginId}</span></p>
        <p>初期パスワード：<span className="font-mono font-medium">{result.tempPassword}</span></p>
        <p className="mt-2 text-xs text-gray-600">
          ※ この初期パスワードは一度のみ表示されます。喪主様にお伝えください。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a
            href={`/mypage/sign-in?id=${encodeURIComponent(result.loginId)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-[#9b2fae] px-4 py-2 text-xs text-[#9b2fae]"
          >
            マイページを開く ↗
          </a>
          <button onClick={() => { setResult(null); router.refresh(); }} className="rounded bg-[#9b2fae] px-4 py-2 text-xs text-white">閉じる</button>
        </div>
      </div>
    );
  }

  function submit() {
    setResult(null);
    start(async () => {
      const r = await issueMournerAccount(slug, method, contact);
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="mb-6 rounded bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <div className="flex flex-wrap items-center gap-3">
        <span>ページの公開には喪主アカウントの発行が必要です。</span>
        {!open && (
          <button onClick={() => setOpen(true)} className="rounded bg-[#9b2fae] px-3 py-1.5 text-white">▶ 喪主アカウントを発行</button>
        )}
      </div>
      {open && (
        <div className="mt-3 space-y-3 rounded bg-white p-4 text-gray-700">
          <div className="flex gap-4">
            <label className="flex items-center gap-1"><input type="radio" checked={method === "phone"} onChange={() => pickMethod("phone")} /> 電話番号で発行</label>
            <label className="flex items-center gap-1"><input type="radio" checked={method === "email"} onChange={() => pickMethod("email")} /> メールアドレスで発行</label>
          </div>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={method === "phone" ? "電話番号（ハイフンなし）" : "user@example.com"}
            className="w-full border-b py-2 focus:border-[#9b2fae] focus:outline-none"
          />
          {result?.ok === false && <p className="text-sm text-red-600">{result.error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="rounded border px-4 py-2 text-sm">キャンセル</button>
            <button onClick={submit} disabled={pending || !contact} className="rounded bg-[#9b2fae] px-5 py-2 text-sm text-white disabled:opacity-60">{pending ? "発行中…" : "発行する"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
