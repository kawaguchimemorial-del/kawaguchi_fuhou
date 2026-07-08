"use client";

import { cn } from "@/lib/simulatorUtils";
import { PRINT_SIZE_LABELS } from "@/lib/funeral-script/format";
import type { FuneralScriptPrintSize } from "@/lib/funeral-script/types";

type FuneralScriptToolbarProps = {
  printSize: FuneralScriptPrintSize;
  onPrintSizeChange: (size: FuneralScriptPrintSize) => void;
  onCopy: () => void;
  onCreatePdf: () => void;
  copied: boolean;
  disabled: boolean;
  pdfLoading?: boolean;
};

/**
 * 台本プレビューの操作バー（コピー・印刷・文字サイズ）。印刷時は非表示（.no-print）。
 */
export default function FuneralScriptToolbar({
  printSize,
  onPrintSizeChange,
  onCopy,
  onCreatePdf,
  copied,
  disabled,
  pdfLoading = false,
}: FuneralScriptToolbarProps) {
  return (
    <div className="grid gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:flex sm:flex-wrap sm:items-center">
      <div className="grid gap-1 sm:flex sm:items-center">
        <span className="text-xs font-medium text-slate-600">文字サイズ</span>
        <div className="grid grid-cols-3 overflow-hidden rounded-md border border-stone-300 sm:inline-flex">
          {(Object.keys(PRINT_SIZE_LABELS) as FuneralScriptPrintSize[]).map(
            (size) => (
              <button
                key={size}
                type="button"
                onClick={() => onPrintSizeChange(size)}
                className={cn(
                  "min-h-10 px-3 py-1.5 text-xs font-medium transition",
                  size === printSize
                    ? "bg-amber-600 text-white"
                    : "bg-white text-slate-700 hover:bg-amber-50",
                )}
              >
                {PRINT_SIZE_LABELS[size]}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:ml-auto sm:flex sm:items-center">
        <button
          type="button"
          onClick={onCopy}
          disabled={disabled}
          className="min-h-11 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? "コピーしました" : "全文をコピー"}
        </button>
        <button
          type="button"
          onClick={onCreatePdf}
          disabled={disabled || pdfLoading}
          className="min-h-11 rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pdfLoading ? "PDF作成中..." : "PDFを作成"}
        </button>
      </div>
    </div>
  );
}
