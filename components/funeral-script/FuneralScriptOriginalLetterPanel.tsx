"use client";

import {
  buildOriginalLetterFooter,
  buildOriginalLetterPrintSpec,
  detectOriginalLetterWarnings,
  normalizeOriginalLetterBody,
  originalLetterCharCount,
} from "@/lib/funeral-script/original-letter";
import type {
  FuneralScriptFormData,
  FuneralScriptOriginalLetter,
} from "@/lib/funeral-script/types";

type FuneralScriptOriginalLetterPanelProps = {
  form: FuneralScriptFormData;
  letter: FuneralScriptOriginalLetter | null;
  loading: boolean;
  error: string | null;
  warnings: string[];
  copied: boolean;
  onEditBody: (body: string) => void;
  onRegenerate: () => void;
  onCopy: () => void;
};

/** 角を飾る百合（ゆり）の装飾。画像を追加せず inline SVG で表現。 */
function LilyOrnament({ className }: { className?: string }) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden>
      <g transform="translate(40 40)">
        {petals.map((deg) => (
          <ellipse
            key={deg}
            cx="0"
            cy="-16"
            rx="6"
            ry="16"
            fill="#d9cfa8"
            opacity="0.75"
            transform={`rotate(${deg})`}
          />
        ))}
        <circle r="5" fill="#bda35c" opacity="0.85" />
      </g>
      <g
        fill="none"
        stroke="#b7c2a0"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.8"
      >
        <path d="M40 56 Q44 68 58 72" />
        <path d="M50 64 q-2 -7 6 -9" />
        <path d="M40 56 Q36 68 22 72" />
        <path d="M30 64 q2 -7 -6 -9" />
      </g>
    </svg>
  );
}

export default function FuneralScriptOriginalLetterPanel({
  form,
  letter,
  loading,
  error,
  warnings,
  copied,
  onEditBody,
  onRegenerate,
  onCopy,
}: FuneralScriptOriginalLetterPanelProps) {
  if (!form.hasOriginalCondolenceLetter) return null;

  if (!letter) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="rounded-md border border-dashed border-stone-300 bg-[#fcfbf8] p-10 text-center text-sm leading-6 text-slate-500">
          オリジナル会葬礼状は「台本を生成する」で
          <br />
          初稿（清書イメージ）を作成します。
        </div>
      </section>
    );
  }

  const localWarnings = detectOriginalLetterWarnings(letter.body);
  const allWarnings = Array.from(new Set([...warnings, ...localWarnings]));
  const normalizedBody = normalizeOriginalLetterBody(letter.body);
  const charCount = originalLetterCharCount(letter.body);
  const footer = buildOriginalLetterFooter(form);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
      {/* 操作行 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          印刷会社提出用
        </span>
        {letter.aiGenerated && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            AI生成済み
          </span>
        )}
        <span className="text-[11px] text-slate-500">
          本文 {charCount}字 ／ 縦書き想定
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={loading}
            className="min-h-9 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "再生成中..." : "礼状だけ再生成"}
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={loading}
            className="min-h-9 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? "コピーしました" : "提出用テキストをコピー"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {allWarnings.length > 0 && (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
          <p className="text-xs font-semibold text-amber-800">
            確認してください（{allWarnings.length}件）
          </p>
          <ul className="mt-1 list-disc pl-5 text-xs leading-5 text-slate-700">
            {allWarnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 清書イメージ（百合の装飾枠） */}
      <div className="relative overflow-hidden rounded-md border border-amber-200/70 bg-[#fcfaf3] px-6 py-8 shadow-inner sm:px-10 sm:py-10">
        <LilyOrnament className="pointer-events-none absolute -right-3 -top-3 h-24 w-24" />
        <LilyOrnament className="pointer-events-none absolute -bottom-3 -left-3 h-24 w-24 rotate-180" />
        <div className="relative">
          <p className="whitespace-pre-wrap font-serif text-[13px] leading-8 text-slate-800">
            {normalizedBody}
          </p>
          <p className="mt-8 whitespace-pre-wrap text-right font-serif text-[13px] leading-7 text-slate-800">
            {footer}
          </p>
        </div>
      </div>

      <footer className="mt-3 flex items-center justify-between px-1 text-xs text-slate-500">
        <span>全 1 ページ</span>
        <span>本文は下の「本文を編集」から修正できます</span>
      </footer>

      {/* 本文編集（折りたたみ） */}
      <details className="mt-3 rounded-md border border-stone-200 bg-white">
        <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
          本文を編集
        </summary>
        <div className="border-t border-stone-100 p-3">
          <textarea
            value={letter.body}
            onChange={(e) => onEditBody(e.target.value)}
            rows={Math.min(14, Math.max(9, letter.body.split("\n").length + 2))}
            className="min-h-56 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 font-serif text-sm leading-7 text-slate-900 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-300"
          />
        </div>
      </details>

      {/* 印刷仕様・差出人（折りたたみ） */}
      <details className="mt-2 rounded-md border border-stone-200 bg-white">
        <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
          印刷仕様・差出人
        </summary>
        <div className="grid gap-3 border-t border-stone-100 p-3 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">仕様</h3>
            <pre className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">
              {buildOriginalLetterPrintSpec(form, letter)}
            </pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">差出人</h3>
            <pre className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">
              {footer}
            </pre>
          </div>
        </div>
      </details>
    </section>
  );
}
