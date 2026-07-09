"use client";

import { cn } from "@/lib/simulatorUtils";
import {
  IconAdjust,
  IconExport,
  IconFinish,
  IconLotus,
  IconPreview,
  IconUpload,
} from "@/components/iei-photo/studio/StudioIcons";

export type StudioNavId =
  | "upload"
  | "adjust"
  | "background"
  | "finish"
  | "preview"
  | "export";

type NavItem = {
  id: StudioNavId;
  label: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { id: "upload", label: "読み込み", icon: <IconUpload /> },
  { id: "adjust", label: "補正・調整", icon: <IconAdjust /> },
  { id: "background", label: "背景", icon: <IconPreview /> },
  { id: "finish", label: "仕上げ", icon: <IconFinish /> },
  { id: "preview", label: "プレビュー", icon: <IconPreview /> },
  { id: "export", label: "書き出し", icon: <IconExport /> },
];

/**
 * 左の濃紺サイドバー（モック準拠）。
 * 各項目はクリックで該当セクションへスクロール（onNavigate）。
 * 「ホーム」のみ既存サイト導線を増やさないため遷移はしない（現状は装飾＋アクティブ表示）。
 */
export default function StudioSidebar({
  active,
  onNavigate,
}: {
  active: StudioNavId;
  onNavigate: (id: StudioNavId) => void;
}) {
  return (
    <aside className="flex w-14 shrink-0 flex-col items-center bg-slate-900 py-4 text-slate-300 sm:w-56 sm:items-stretch sm:px-3">
      <div className="mb-6 flex items-center gap-2 px-1 text-amber-300 sm:px-2">
        <IconLotus className="h-8 w-8 shrink-0" />
        <span className="hidden text-sm font-semibold text-slate-100 sm:block">
          メモリアル
          <br />
          フォトサポート
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex items-center justify-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium transition sm:justify-start",
                isActive
                  ? "bg-amber-500/15 text-amber-200"
                  : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="hidden sm:block">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
