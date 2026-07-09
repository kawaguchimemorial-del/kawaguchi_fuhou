"use client";

import { cn } from "@/lib/simulatorUtils";
import type { IeiPhotoQualityCheckItem } from "@/lib/iei-photo/types";

type IeiPhotoQualityCheckProps = {
  items: IeiPhotoQualityCheckItem[];
};

const STATUS_STYLE: Record<
  IeiPhotoQualityCheckItem["status"],
  { label: string; className: string }
> = {
  pending: { label: "未判定", className: "bg-stone-100 text-stone-600" },
  pass: { label: "合格", className: "bg-emerald-100 text-emerald-700" },
  warn: { label: "要確認", className: "bg-amber-100 text-amber-800" },
  fail: { label: "不合格", className: "bg-rose-100 text-rose-700" },
};

/**
 * 品質チェック項目の表示。
 * MVP では実判定を行わないため、各項目は「未判定」を初期表示とする。
 */
export default function IeiPhotoQualityCheck({
  items,
}: IeiPhotoQualityCheckProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-amber-700">品質チェック</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          仕上がりの確認項目
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          現在は項目の表示のみです（自動判定は未実装）。
        </p>
      </div>

      <ul className="grid gap-3">
        {items.map((item) => {
          const style = STATUS_STYLE[item.status];
          return (
            <li
              key={item.key}
              className="flex items-start justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {item.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {item.description}
                </p>
                {item.note && (
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {item.note}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                  style.className,
                )}
              >
                {style.label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
