"use client";

import { useEffect, useState } from "react";
import { frameImageSrc } from "@/lib/memorial/altar-frames";
import {
  backgroundSrc,
  topSrc,
  sideFlowerSrc,
  sideFlowerFile,
  centerSrc,
  centerHidden,
  centerHasSmoke,
  centerKind,
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
  const kind = centerKind(altar.center);

  // 中央素材の種別ごとにサイズ・高さを出し分け（焼香台は幅広・低め、線香は細く高め）。
  const centerBox =
    kind === "焼香"
      ? "bottom-[10%] w-[22%]"
      : kind === "線香"
      ? "bottom-[10%] w-[12%]"
      : "bottom-[10%] w-[16%]"; // 花

  // 花飾り（左右）：黒・白（花瓶タイプ）は小ぶりなので大きめに。花1/花2は元サイズ。
  const sideFile = sideFlowerFile(altar.sideFlower);
  const sideH = sideFile === "黒" || sideFile === "白" ? "h-[34%]" : "h-[27%]";

  // お参りボタン：煙を一度立ちのぼらせて、一定時間で自然に止める。
  function startSmoke() {
    if (!hasSmoke) return;
    setSmoking(false);
    // 再クリックでも確実に再生させるため、次フレームでON
    requestAnimationFrame(() => setSmoking(true));
  }

  // 煙は立ちのぼり切ったら止める（ずっとモクモクさせない）。
  const SMOKE_MS = 11000;
  useEffect(() => {
    if (!smoking) return;
    const t = setTimeout(() => setSmoking(false), SMOKE_MS);
    return () => clearTimeout(t);
  }, [smoking]);

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

        {/* 遺影＋額縁（中央・奥）。下端は天板の背に隠れる。大切な遺影は大きく見せる。 */}
        <div className="absolute bottom-[25%] left-1/2 h-[70%] -translate-x-1/2" style={{ aspectRatio: "5 / 7" }}>
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

        {/* 天板（遺影の手前に重ね、遺影の下端を隠す）。大きめ・低めに配置。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={topSrc(altar.top)}
          alt=""
          aria-hidden
          className="absolute bottom-[3%] left-1/2 w-[80%] -translate-x-1/2"
        />

        {/* 花飾り（左右）：天板の上に立てる（内側寄りに配置） */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sideFlowerSrc(altar.sideFlower)}
          alt=""
          aria-hidden
          className={"absolute bottom-[10%] left-[21%] -translate-x-1/2 " + sideH}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sideFlowerSrc(altar.sideFlower)}
          alt=""
          aria-hidden
          className={"absolute bottom-[10%] right-[21%] translate-x-1/2 " + sideH}
        />

        {/* 中央（焼香台／線香／花）＋煙：天板の上・中央 */}
        {showCenter && (
          <div className={"absolute left-1/2 flex -translate-x-1/2 justify-center " + centerBox}>
            {/* 煙（焼香/線香選択時、お参り後に立ちのぼり、一定時間で止まる） */}
            {hasSmoke && smoking && (
              <div className="pointer-events-none absolute inset-x-0 top-[-190%] h-[230%]">
                <span className="altar-smoke-puff" style={{ animationDelay: "0s" }} />
                <span className="altar-smoke-puff" style={{ animationDelay: "0.9s", width: "48%" }} />
                <span className="altar-smoke-puff" style={{ animationDelay: "1.9s", width: "56%" }} />
                <span className="altar-smoke-puff" style={{ animationDelay: "3.1s", width: "50%" }} />
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
            onClick={startSmoke}
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
