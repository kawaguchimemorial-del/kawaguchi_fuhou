"use client";

import { useState } from "react";
import { cn } from "@/lib/simulatorUtils";
import IeiPhotoCropGuides from "@/components/iei-photo/IeiPhotoCropGuides";

/**
 * 中央の「元の写真」→「仕上がりプレビュー」2枚並び（モック準拠）。
 * - 左: 元写真（オリジナルバッジ）
 * - 右: 仕上がり（補正・トリミング反映済みの出力プレビュー）
 * ガイド線は表示のみ（書き出し画像には焼き込まない）。
 * ズームは仕上がりプレビューの表示倍率のみ（出力解像度には影響しない）。
 */
export default function StudioCanvas({
  beforeUrl,
  outputUrl,
  aspect,
  showGuides,
}: {
  beforeUrl: string | null;
  outputUrl: string | null;
  /** 仕上がりプレビュー枠の縦横比（"w / h"）。 */
  aspect: string;
  /** ガイド線表示（基準写真のときのみ true 相当を渡す）。 */
  showGuides: boolean;
}) {
  const [zoom, setZoom] = useState(100);
  const clampZoom = (v: number) => Math.min(200, Math.max(50, v));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        {/* 元の写真 */}
        <figure className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <figcaption className="mb-3 flex items-center justify-between">
            <span className="text-base font-semibold text-slate-800">
              元の写真
            </span>
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              オリジナル
            </span>
          </figcaption>
          <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg bg-stone-100">
            {beforeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={beforeUrl}
                alt="元の写真"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="px-4 text-center text-sm text-slate-500">
                写真を読み込むと表示されます
              </span>
            )}
          </div>
        </figure>

        {/* 中央の矢印 */}
        <div className="hidden justify-center lg:flex">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>

        {/* 仕上がりプレビュー */}
        <figure className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <figcaption className="mb-3 flex items-center justify-between">
            <span className="text-base font-semibold text-slate-800">
              仕上がりプレビュー
            </span>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              仕上がり
            </span>
          </figcaption>
          <div
            className="relative flex items-center justify-center overflow-hidden rounded-lg bg-stone-100"
            style={{ aspectRatio: aspect }}
          >
            {outputUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={outputUrl}
                  alt="仕上がりプレビュー"
                  className="h-full w-full object-contain transition-transform"
                  style={{ transform: `scale(${zoom / 100})` }}
                />
                {showGuides && <IeiPhotoCropGuides />}
              </>
            ) : (
              <span className="px-4 text-center text-sm text-slate-500">
                写真を読み込むと、補正後のプレビューが表示されます
              </span>
            )}
          </div>

          {/* ズームコントロール */}
          <div className="mt-3 flex items-center justify-end gap-2">
            <div className="flex items-center overflow-hidden rounded-lg border border-stone-300">
              <button
                type="button"
                aria-label="縮小"
                onClick={() => setZoom((z) => clampZoom(z - 10))}
                disabled={!outputUrl}
                className="px-3 py-1.5 text-slate-600 transition hover:bg-stone-100 disabled:opacity-40"
              >
                −
              </button>
              <span className="min-w-[3.5rem] border-x border-stone-300 px-2 py-1.5 text-center text-xs font-semibold tabular-nums text-slate-700">
                {zoom}%
              </span>
              <button
                type="button"
                aria-label="拡大"
                onClick={() => setZoom((z) => clampZoom(z + 10))}
                disabled={!outputUrl}
                className="px-3 py-1.5 text-slate-600 transition hover:bg-stone-100 disabled:opacity-40"
              >
                ＋
              </button>
            </div>
            <button
              type="button"
              onClick={() => setZoom(100)}
              disabled={!outputUrl}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-stone-100",
                "disabled:opacity-40",
              )}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </svg>
              フィット
            </button>
          </div>
        </figure>
      </div>
    </div>
  );
}
