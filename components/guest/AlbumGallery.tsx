"use client";

import { useCallback, useEffect, useState } from "react";

// アルバム：サムネイル一覧＋前面ライトボックス（＜＞で移動・写真以外クリックで閉じる）
export function AlbumGallery({ paths }: { paths: string[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const open = index !== null;

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(
    () => setIndex((i) => (i === null ? i : (i - 1 + paths.length) % paths.length)),
    [paths.length]
  );
  const next = useCallback(
    () => setIndex((i) => (i === null ? i : (i + 1) % paths.length)),
    [paths.length]
  );

  // キーボード操作（←→で移動・Escで閉じる）＆背面スクロール抑止
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, prev, next]);

  return (
    <>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {paths.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className="block focus:outline-none"
            aria-label={`葬儀写真 ${i + 1} を拡大`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`葬儀写真 ${i + 1}`} className="aspect-square w-full cursor-pointer object-cover" />
          </button>
        ))}
      </div>

      {open && (
        // オーバーレイ（写真以外の余白クリックで閉じる）
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          {/* 閉じる */}
          <button
            type="button"
            onClick={close}
            aria-label="閉じる"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
          >
            ×
          </button>

          {/* 前へ */}
          {paths.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="前の写真"
              className="absolute left-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/25 sm:left-6"
            >
              ‹
            </button>
          )}

          {/* 拡大写真（クリックは伝播させず閉じない） */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={paths[index!]}
            alt={`葬儀写真 ${index! + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[88vw] object-contain shadow-2xl"
          />

          {/* 次へ */}
          {paths.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="次の写真"
              className="absolute right-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/25 sm:right-6"
            >
              ›
            </button>
          )}

          {/* 枚数表示 */}
          {paths.length > 1 && (
            <p className="absolute bottom-5 text-sm text-white/80">
              {index! + 1} / {paths.length}
            </p>
          )}
        </div>
      )}
    </>
  );
}
