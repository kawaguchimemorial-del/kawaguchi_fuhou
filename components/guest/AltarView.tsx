"use client";

import { useState } from "react";
import { frameImageSrc } from "@/lib/memorial/altar-frames";
import {
  backgroundSrc,
  topSrc,
  sideFlowerSrc,
  centerSrc,
  centerHidden,
  centerHasSmoke,
  worshipButtonLabel,
} from "@/lib/memorial/altar-assets";

// 実物の「祭壇設定」レイヤーを透過PNG素材で重ねて再現する。
// 背景・天板・花飾り・遺影＋額縁・中央（焼香/線香）を絶対配置で合成し、
// 焼香/線香を選んでいるときはお参りボタンで煙を立ちのぼらせる。
export function AltarView({
  altar,
  portraitAlt,
  interactive = false,
}: {
  // 設定値は文字列で受け、素材ヘルパー側で正規化する（ウィザードのゆるい値も許容）。
  altar: {
    frame?: string;
    sideFlower?: string;
    center?: string;
    top?: string;
    background?: string;
    portraitPath?: string;
  };
  portraitAlt?: string;
  interactive?: boolean; // true のときお参りボタン＋煙演出を表示
}) {
  const [smoking, setSmoking] = useState(false);
  const hasSmoke = centerHasSmoke(altar.center);
  const showCenter = !centerHidden(altar.center);

  return (
    <div className="w-full">
      {/* 祭壇ステージ（各レイヤーを％指定で絶対配置。背景→遺影→天板→花→中央の順に重ねる） */}
      <div className="relative mx-auto aspect-[4/3] w-full max-w-3xl overflow-hidden sm:aspect-[3/2] md:aspect-[16/9]">
        {/* 背景（幕）：上部。下は床（白） */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={backgroundSrc(altar.background)}
          alt=""
          aria-hidden
          className="absolute left-0 top-0 h-[72%] w-full object-cover"
        />

        {/* 遺影＋額縁（中央・奥）。下端は天板の背に隠れる */}
        <div className="absolute bottom-[26%] left-1/2 h-[48%] -translate-x-1/2" style={{ aspectRatio: "5 / 7" }}>
          <div className="absolute inset-x-[10.5%] inset-y-[7.5%] flex items-center justify-center bg-[var(--card)]">
            {altar.portraitPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={altar.portraitPath} alt={portraitAlt ?? "ご遺影"} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-[var(--muted)]">ご遺影</span>
            )}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={frameImageSrc(altar.frame)} alt="" aria-hidden className="absolute inset-0 h-full w-full" />
        </div>

        {/* 天板（遺影の手前に重ね、遺影の下端を隠す） */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={topSrc(altar.top)}
          alt=""
          aria-hidden
          className="absolute bottom-[8%] left-1/2 w-[64%] -translate-x-1/2"
        />

        {/* 花飾り（左右）：天板の上に立てる */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sideFlowerSrc(altar.sideFlower)}
          alt=""
          aria-hidden
          className="absolute bottom-[12%] left-[20%] h-[30%] -translate-x-1/2"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sideFlowerSrc(altar.sideFlower)}
          alt=""
          aria-hidden
          className="absolute bottom-[12%] right-[20%] h-[30%] translate-x-1/2"
        />

        {/* 中央（焼香台／線香／花）＋煙：天板の中央手前 */}
        {showCenter && (
          <div className="absolute bottom-[9%] left-1/2 flex w-[16%] -translate-x-1/2 justify-center">
            {/* 煙（焼香/線香選択時、お参り後に表示） */}
            {hasSmoke && smoking && (
              <div className="pointer-events-none absolute inset-x-0 top-[-150%] h-[190%]">
                <span className="altar-smoke-puff" style={{ animationDelay: "0s" }} />
                <span className="altar-smoke-puff" style={{ animationDelay: "1.2s", width: "34%" }} />
                <span className="altar-smoke-puff" style={{ animationDelay: "2.6s", width: "40%" }} />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={centerSrc(altar.center)} alt="" aria-hidden className="relative w-full" />
          </div>
        )}
      </div>

      {/* お参りボタン（interactive時） */}
      {interactive && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setSmoking(true)}
            className="inline-block rounded-full bg-[var(--accent)] px-14 py-3 text-white transition-colors hover:bg-[var(--accent-strong)]"
          >
            {worshipButtonLabel(altar.center)}
          </button>
          {hasSmoke && smoking && (
            <p className="mt-3 text-sm text-[var(--muted)]">心を込めて{worshipButtonLabel(altar.center)}いたしました。</p>
          )}
        </div>
      )}
    </div>
  );
}
