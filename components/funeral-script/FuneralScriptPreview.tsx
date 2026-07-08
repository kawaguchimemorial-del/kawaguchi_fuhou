"use client";

import { cn } from "@/lib/simulatorUtils";
import { printBodyTextClass } from "@/lib/funeral-script/format";
import type {
  FuneralScriptPrintSize,
  FuneralScriptSection,
} from "@/lib/funeral-script/types";

type FuneralScriptPreviewProps = {
  sections: FuneralScriptSection[];
  printSize: FuneralScriptPrintSize;
  onEditBody: (id: string, body: string) => void;
};

/** セクション間の小さな装飾区切り（◆—◆） */
function Divider() {
  return (
    <div className="my-4 flex items-center justify-center gap-2 text-stone-300">
      <span className="h-px w-10 bg-stone-200" />
      <span className="text-[10px]">◆</span>
      <span className="h-px w-10 bg-stone-200" />
    </div>
  );
}

/**
 * 画面上の対話プレビュー。
 * モックの「清書イメージ」に寄せた紙面スタイルで表示しつつ、本文は直接編集できる。
 * - 各セクションは【見出し】＋本文の縦並び、装飾区切りで区切る。
 * - 本文テキストエリアは紙面に溶け込む見た目（通常は枠なし、フォーカスで強調）。
 * - AI生成予定/済みはラベルで区別。司会者メモ（note）は注記表示。
 * 印刷は FuneralScriptPrintView が担当する。
 */
export default function FuneralScriptPreview({
  sections,
  printSize,
  onEditBody,
}: FuneralScriptPreviewProps) {
  if (sections.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="rounded-md border border-dashed border-stone-300 bg-[#fcfbf8] p-10 text-center text-sm leading-6 text-slate-500">
          入力画面で「台本を生成する」を押すと、
          <br />
          ここに清書イメージの台本が表示されます。
        </div>
      </div>
    );
  }

  // 進行番号は区切り（note）を除いて採番する
  const stepNumbers = sections.map((s, i) =>
    s.kind === "note"
      ? null
      : sections.slice(0, i + 1).filter((x) => x.kind !== "note").length,
  );
  const stepTotal = sections.filter((s) => s.kind !== "note").length;

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="rounded-md border border-stone-200 bg-[#fcfbf8] px-4 py-5 sm:px-6 sm:py-7">
        {sections.map((section, index) => {
          // 日付区切り（通夜・告別式の統合台本）は見出しバーで表示
          if (section.kind === "note") {
            return (
              <div
                key={section.id}
                className="mt-5 rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white first:mt-0"
              >
                {section.title}
                {section.body && (
                  <span className="ml-2 text-xs font-normal text-slate-300">
                    {section.body}
                  </span>
                )}
              </div>
            );
          }

          const isAiSlot =
            section.kind === "ai_placeholder" || section.aiGenerated;
          const isGenerated = Boolean(section.aiGenerated);
          const showDivider = index > 0 && sections[index - 1].kind !== "note";

          return (
            <div key={section.id}>
              {showDivider && <Divider />}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-600/90 px-1.5 text-[11px] font-semibold text-white">
                  {stepNumbers[index]}
                </span>
                <h3 className="font-serif text-[15px] font-bold tracking-wide text-slate-900">
                  【{section.title}】
                </h3>
                {isGenerated ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    AI生成済み
                  </span>
                ) : (
                  isAiSlot && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      AI生成予定
                    </span>
                  )
                )}
              </div>

              <textarea
                value={section.body}
                onChange={(e) => onEditBody(section.id, e.target.value)}
                rows={Math.min(
                  14,
                  Math.max(2, section.body.split("\n").length),
                )}
                className={cn(
                  "mt-1.5 w-full resize-y rounded-md border border-transparent bg-transparent px-2 py-1.5 font-serif leading-7 text-slate-800 transition",
                  "hover:border-stone-200 hover:bg-white focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300",
                  printBodyTextClass(printSize),
                )}
              />

              {section.note && (
                <p className="mt-1 rounded-md bg-stone-100 px-3 py-2 text-xs leading-5 text-slate-600">
                  〔司会者メモ〕{section.note}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <footer className="mt-3 flex items-center justify-between px-1 text-xs text-slate-500">
        <span>全 {stepTotal} セクション</span>
        <span>本文はクリックして直接編集できます</span>
      </footer>
    </div>
  );
}
