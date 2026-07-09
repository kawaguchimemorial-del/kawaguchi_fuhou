"use client";

import { cn } from "@/lib/simulatorUtils";

type IeiPhotoUploaderProps = {
  /** 選択された画像のローカルプレビュー URL（未選択時は null） */
  previewUrl: string | null;
  fileName: string | null;
  onSelectFile: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
};

/**
 * 写真アップロードエリア。
 * MVP ではブラウザ内プレビューのみ（サーバーへの保存は行わない）。
 */
export default function IeiPhotoUploader({
  previewUrl,
  fileName,
  onSelectFile,
  onClear,
  disabled = false,
}: IeiPhotoUploaderProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-amber-700">元写真</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          写真をアップロード
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          現時点ではブラウザ内でのプレビューのみです。画像はサーバーに保存されません。
        </p>
      </div>

      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center transition hover:border-amber-500 hover:bg-amber-50/40",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="text-sm font-semibold text-slate-700">
          ここをクリックして写真を選択
        </span>
        <span className="mt-1 text-xs text-slate-500">
          JPEG / PNG などの画像ファイル
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onSelectFile(file);
            }
            // 同じファイルを再選択できるよう値をリセット
            e.target.value = "";
          }}
        />
      </label>

      {previewUrl && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm text-slate-700">
              選択中: {fileName ?? "画像"}
            </p>
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              className="shrink-0 rounded-md border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-stone-100 disabled:opacity-60"
            >
              取り消す
            </button>
          </div>
          <div className="mt-3 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
            {/* ローカルプレビューのため next/image ではなく img を使用 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="アップロードした元写真のプレビュー"
              className="mx-auto max-h-80 w-auto object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
