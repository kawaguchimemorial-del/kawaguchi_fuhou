"use client";

/**
 * トリミングガイド（SVG オーバーレイ）
 *
 * 表示専用のオーバーレイで、書き出し画像（Canvas）には一切焼き込みません。
 * 基準写真プレビュー（縦長 3:4）の上に絶対配置して使います。
 *
 * viewBox は 0..100 の正方系を preserveAspectRatio="none" でプレビュー枠に引き伸ばし、
 * 線は vector-effect="non-scaling-stroke" で細さを保ちます。
 */
export default function IeiPhotoCropGuides() {
  const line = "rgba(255,255,255,0.85)";
  const lineDark = "rgba(15,23,42,0.55)";

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* 三分割線（縦） */}
      <line x1="33.33" y1="0" x2="33.33" y2="100" stroke={lineDark} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <line x1="66.66" y1="0" x2="66.66" y2="100" stroke={lineDark} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {/* 三分割線（横） */}
      <line x1="0" y1="33.33" x2="100" y2="33.33" stroke={lineDark} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="66.66" x2="100" y2="66.66" stroke={lineDark} strokeWidth="1" vectorEffect="non-scaling-stroke" />

      {/* 中央線（縦・横） */}
      <line x1="50" y1="0" x2="50" y2="100" stroke={line} strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="50" x2="100" y2="50" stroke={line} strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />

      {/* 頭上余白の目安ライン（上部） */}
      <line x1="0" y1="12" x2="100" y2="12" stroke="rgba(217,119,6,0.9)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      {/* 肩位置の目安ライン（下部） */}
      <line x1="0" y1="80" x2="100" y2="80" stroke="rgba(217,119,6,0.9)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />

      {/* 顔位置の目安エリア（楕円） */}
      <ellipse cx="50" cy="42" rx="22" ry="28" fill="rgba(217,119,6,0.10)" stroke="rgba(217,119,6,0.9)" strokeWidth="1.5" strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
