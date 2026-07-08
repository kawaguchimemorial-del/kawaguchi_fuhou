"use client";

import { useCallback, useRef, useState } from "react";
import { parseSavedFile } from "@/lib/funeral-script/save-file";
import type {
  FuneralScriptFormData,
  FuneralScriptOriginalLetter,
  FuneralScriptSection,
} from "@/lib/funeral-script/types";

type FuneralScriptFileControlsProps = {
  /** 保存できる状態か（台本が生成済みか） */
  canSave: boolean;
  /** 現在の台本をファイルに書き出す */
  onSave: () => void;
  /** 読み込み成功時（form と sections を復元） */
  onLoaded: (
    form: FuneralScriptFormData,
    sections: FuneralScriptSection[],
    originalLetter?: FuneralScriptOriginalLetter | null,
  ) => void;
};

const cardClass =
  "rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5";
const btnClass =
  "min-h-11 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50";

export default function FuneralScriptFileControls({
  canSave,
  onSave,
  onLoaded,
}: FuneralScriptFileControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = useCallback(() => {
    setMessage(null);
    setError(null);
    inputRef.current?.click();
  }, []);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // 同じファイルを連続で選べるよう value をクリア
      e.target.value = "";
      if (!file) return;

      try {
        const text = await file.text();
        const result = parseSavedFile(text);
        if (!result.ok) {
          setError(result.error);
          setMessage(null);
          return;
        }
        onLoaded(
          result.data.form,
          result.data.sections,
          result.data.originalLetter,
        );
        setError(null);
        setMessage(
          `「${result.data.form.deceasedName || "無名"}」の台本を読み込みました。式種別と通夜の様子を確認し、「台本を生成する」で告別式台本にできます。`,
        );
      } catch {
        // 個人情報を含み得るため内容はログ出力しない
        setError("ファイルの読み込みに失敗しました。");
        setMessage(null);
      }
    },
    [onLoaded],
  );

  return (
    <section className={cardClass}>
      <h2 className="mb-1 text-base font-semibold text-slate-950">
        台本の保存・引き継ぎ
      </h2>
      <p className="mb-3 text-xs leading-5 text-slate-500">
        通夜の台本をファイルに保存し、翌日に読み込むと告別式台本へ引き継げます（サーバー保存はしません）。
      </p>
      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className={btnClass}
        >
          台本をファイルに保存
        </button>
        <button type="button" onClick={handlePick} className={btnClass}>
          台本ファイルを読み込み
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          className="hidden"
        />
      </div>
      {message && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
