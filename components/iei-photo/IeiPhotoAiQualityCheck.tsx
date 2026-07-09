"use client";

import { cn } from "@/lib/simulatorUtils";
import type { IeiPhotoAiCheckItem } from "@/lib/iei-photo/types";

/** AI生成後の目視確認チェック項目（既定）。将来は自動判定で status を更新できる。 */
export const IEI_PHOTO_AI_POST_CHECKS: IeiPhotoAiCheckItem[] = [
  {
    label: "本人らしさチェック",
    status: "needs_review",
    note: "顔の同一性が保たれているか目視で確認してください。",
  },
  {
    label: "肌の自然さチェック",
    status: "needs_review",
    note: "肌が滑らかすぎたり模様のように見えていないか確認してください。",
  },
  {
    label: "シワ・ほくろ保持チェック",
    status: "needs_review",
    note: "シワやほくろが消えたり描いたように変化していないか確認してください。",
  },
  {
    label: "AIっぽさチェック",
    status: "needs_review",
    note: "不自然なAI特有の質感や破綻が出ていないか確認してください。",
  },
  {
    label: "服装・背景自然さチェック",
    status: "needs_review",
    note: "服や背景に不自然な模様・破綻がないか確認してください。",
  },
];

const STATUS_BADGE: Record<
  IeiPhotoAiCheckItem["status"],
  { label: string; className: string }
> = {
  needs_review: {
    label: "要確認",
    className: "bg-amber-100 text-amber-800",
  },
  warning: { label: "注意", className: "bg-rose-100 text-rose-700" },
  ok: { label: "OK", className: "bg-emerald-100 text-emerald-700" },
};

type IeiPhotoAiQualityCheckProps = {
  /** チェック項目（省略時は既定リスト）。 */
  items?: IeiPhotoAiCheckItem[];
};

/**
 * AI生成後チェックパネル（目視確認用）。
 * 現状は自動判定せず「要確認」を表示するだけ。型・コンポーネントを分離してあるので、
 * 将来は items を差し替えて自動判定結果を反映できる。
 */
export default function IeiPhotoAiQualityCheck({
  items = IEI_PHOTO_AI_POST_CHECKS,
}: IeiPhotoAiQualityCheckProps) {
  return (
    <section className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3">
        <p className="text-sm font-semibold text-amber-700">AI生成後チェック</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          生成結果を目視で確認
        </h2>
      </div>

      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-5 text-slate-700">
        AI生成後は、肌が滑らかすぎる、シワやほくろが変化している、服や髪に不自然な模様が出ている場合があります。必要に応じて脱AI処理を行ってください。
      </p>

      <ul className="mt-3 space-y-2">
        {items.map((item) => {
          const badge = STATUS_BADGE[item.status];
          return (
            <li
              key={item.label}
              className="rounded-lg border border-stone-200 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                    badge.className,
                  )}
                >
                  {badge.label}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {item.note}
              </p>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        肌が模様っぽい、シワが描いたように見える、ほくろが消えている、髪や服に不自然な質感がある場合は、脱AI処理を試してください。
      </p>
    </section>
  );
}
