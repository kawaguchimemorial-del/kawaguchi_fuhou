"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import { relinkAiPortraitEstimate } from "@/lib/kanri/actions";

export interface EstimateOption {
  id: string;
  no?: string;
  customer?: string;
  deceased?: string;
  date?: string; // 告別式/通夜/没日 いずれか(表示用)
}

// AI遺影一覧の「見積を紐付け直す」ボタン＋選択モーダル。
// 誤って別の施行に紐付いた遺影を、正しい見積へ張り替える。
export function PortraitRelinkButton({
  portraitId,
  currentEstimateId,
  deceasedName,
  estimates,
}: {
  portraitId: string;
  currentEstimateId?: string;
  deceasedName?: string;
  estimates: EstimateOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string>(currentEstimateId ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const norm = (s?: string) => (s ?? "").replace(/[\s　]/g, "");
  const filtered = useMemo(() => {
    const k = norm(q);
    const list = !k ? estimates : estimates.filter((e) => [e.customer, e.deceased, e.no].some((v) => norm(v).includes(k)));
    return list.slice(0, 100);
  }, [q, estimates]);

  function submit() {
    if (!sel) { setErr("紐付ける見積を選択してください。"); return; }
    setErr(null);
    start(async () => {
      const res = await relinkAiPortraitEstimate(portraitId, sel);
      if (res.ok) { setOpen(false); router.refresh(); }
      else setErr(res.error ?? "更新に失敗しました");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setQ(""); setSel(currentEstimateId ?? ""); setErr(null); }}
        className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 font-medium text-gray-600 hover:bg-gray-50"
        title="この遺影を紐付ける見積を修正する"
      >
        <Link2 size={13} /> 見積を紐付け直す
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg bg-white shadow-xl">
            <div className="border-b px-5 py-3">
              <p className="font-bold text-gray-800">見積の紐付けを修正</p>
              <p className="mt-0.5 text-xs text-gray-500">{deceasedName ? `対象者: ${deceasedName} 様` : "対象者未設定"}</p>
            </div>
            <div className="border-b p-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="絞り込み（任意）: 顧客名・故人名・見積No"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#2c8c6f] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-gray-400">一覧から見積を選んでください（{estimates.length}件）。多い場合は上で絞り込めます。</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">該当する見積がありません。</p>
              ) : (
                <ul className="divide-y">
                  {filtered.map((e) => (
                    <li key={e.id}>
                      <label className="flex cursor-pointer items-start gap-3 px-5 py-2.5 hover:bg-gray-50">
                        <input type="radio" name="est" value={e.id} checked={sel === e.id} onChange={() => setSel(e.id)} className="mt-1" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-gray-800">
                            {e.deceased || "（故人未設定）"}
                            {e.id === currentEstimateId && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">現在</span>}
                          </span>
                          <span className="block text-xs text-gray-500">
                            {[e.customer && `顧客: ${e.customer}`, e.no && `No.${e.no}`, e.date].filter(Boolean).join("　")}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {err && <p className="px-5 pt-2 text-xs text-red-500">{err}</p>}
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <button type="button" onClick={() => setOpen(false)} className="rounded border px-4 py-2 text-sm text-gray-600">キャンセル</button>
              <button type="button" onClick={submit} disabled={pending} className="rounded bg-[#2c8c6f] px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? "更新中…" : "この見積に紐付ける"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
