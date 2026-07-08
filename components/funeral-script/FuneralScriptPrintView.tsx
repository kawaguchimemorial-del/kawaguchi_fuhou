import { cn } from "@/lib/simulatorUtils";
import {
  CEREMONY_TYPE_LABELS,
  printBodyTextClass,
  printHeadingTextClass,
} from "@/lib/funeral-script/format";
import { originalLetterToPrintText } from "@/lib/funeral-script/original-letter";
import type {
  FuneralScriptCeremonyType,
  FuneralScriptFormData,
  FuneralScriptOriginalLetter,
  FuneralScriptPrintSize,
  FuneralScriptSection,
} from "@/lib/funeral-script/types";

type FuneralScriptPrintViewProps = {
  sections: FuneralScriptSection[];
  form: FuneralScriptFormData;
  ceremonyType: FuneralScriptCeremonyType;
  deceasedName: string;
  printSize: FuneralScriptPrintSize;
  originalLetter?: FuneralScriptOriginalLetter | null;
};

/**
 * 印刷専用ビュー。
 * 画面上は CSS（.fs-print-root）で非表示にし、印刷時のみ表示する。
 * - 短い案内（avoidPageBreak）は途中改ページを避ける（.avoid-break）。
 * - 見出しはページ末尾に残らないようにする（.fs-heading: break-after: avoid）。
 * - 長文ナレーションは自然改ページを許可する。
 */
export default function FuneralScriptPrintView({
  sections,
  form,
  ceremonyType,
  deceasedName,
  printSize,
  originalLetter,
}: FuneralScriptPrintViewProps) {
  const name = deceasedName.trim();
  return (
    <div className="mx-auto max-w-[720px] px-2">
      <header className="mb-6 border-b border-stone-300 pb-3">
        <p className="text-xs text-slate-500">葬儀司会台本</p>
        <h1 className={cn("font-bold text-slate-950", printHeadingTextClass(printSize))}>
          {CEREMONY_TYPE_LABELS[ceremonyType]}
        </h1>
        {name && <p className="mt-1 text-sm text-slate-700">故 {name} 様</p>}
      </header>

      {sections.map((section, index) => {
        // 日付区切り（通夜・告別式の統合台本）
        if (section.kind === "note") {
          return (
            <h2
              key={section.id}
              className={cn(
                "fs-heading avoid-break mt-6 mb-2 border-b-2 border-slate-700 pb-1 font-bold text-slate-950",
                printHeadingTextClass(printSize),
              )}
            >
              {section.title}
            </h2>
          );
        }
        const stepNo = sections
          .slice(0, index + 1)
          .filter((x) => x.kind !== "note").length;
        return (
          <section
            key={section.id}
            className={cn(
              "fs-section mb-5",
              section.avoidPageBreak && "avoid-break",
            )}
          >
            <h2
              className={cn(
                "fs-heading mb-1 font-semibold text-slate-950",
                printHeadingTextClass(printSize),
              )}
            >
              {stepNo}. {section.title}
            </h2>
            <p
              className={cn(
                "whitespace-pre-wrap text-slate-900",
                printBodyTextClass(printSize),
              )}
            >
              {section.body}
            </p>
            {section.note && (
              <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-500">
                〔司会者メモ〕{section.note}
              </p>
            )}
          </section>
        );
      })}

      {form.hasOriginalCondolenceLetter && originalLetter && (
        <section className="fs-section fs-letter-page mt-10 border-t border-stone-300 pt-5">
          <h2
            className={cn(
              "fs-heading mb-3 font-semibold text-slate-950",
              printHeadingTextClass(printSize),
            )}
          >
            印刷会社提出用 オリジナル会葬礼状原稿
          </h2>
          <p
            className={cn(
              "whitespace-pre-wrap text-slate-900",
              printBodyTextClass(printSize),
            )}
          >
            {originalLetterToPrintText(form, originalLetter)}
          </p>
        </section>
      )}
    </div>
  );
}
