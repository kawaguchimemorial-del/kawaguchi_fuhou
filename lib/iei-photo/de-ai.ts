/**
 * 脱AI処理（肌なじませ）— ブラウザ内 Canvas 処理のみ
 *
 * gpt-image 等のAI生成は、肌がつるつるになりすぎたり模様のように見えたりする。
 * その「AIっぽさ」を弱めて写真らしい自然な質感へなじませる軽い後処理を行う。
 *
 * 方針:
 * - サーバーAI不使用。すべてブラウザ内 Canvas（filter + drawImage + putImageData）。
 * - 画像全体を壊さない。顔を強くぼかさない。元のAI画像へ戻せるよう、入力は破壊しない。
 * - 脱AI処理は「AI生成後画像」にのみ適用する想定（呼び出し側で保証する）。
 *
 * 将来拡張（今回は未実装）:
 * - 目・口・髪・眼鏡・ほくろの保護マスク
 * - 元写真の高周波ディテール再合成
 * いずれも getDeAiSettings / createDeAiNoiseOverlay / applyDeAiEffectToImage を
 * 差し替え・合成して拡張できるよう、処理を分割している。
 */

import type { IeiPhotoDeAiStrength } from "./types";

/** 強度ごとの処理パラメータ。 */
export type DeAiSettings = {
  /** ぼかし量（px）。AIのつるつる感を弱める。 */
  blurPx: number;
  /** ぼかし画像を重ねる不透明度（0-1）。 */
  overlayAlpha: number;
  /** 写真粒子（ノイズ）を重ねる不透明度（0-1）。 */
  noiseAlpha: number;
  /** ノイズの振幅（中間グレー128からの揺れ幅）。 */
  noiseAmplitude: number;
  /** 最後に軽く戻すコントラスト（%）。 */
  contrast: number;
  /** 最後に軽く戻す彩度（%）。 */
  saturate: number;
};

/** 強度 → 処理パラメータ。 */
export function getDeAiSettings(strength: IeiPhotoDeAiStrength): DeAiSettings {
  switch (strength) {
    case "light":
      return {
        blurPx: 0.4,
        overlayAlpha: 0.12,
        noiseAlpha: 0.025,
        noiseAmplitude: 32,
        contrast: 104,
        saturate: 102,
      };
    case "strong":
      return {
        blurPx: 1.0,
        overlayAlpha: 0.22,
        noiseAlpha: 0.06,
        noiseAmplitude: 64,
        contrast: 108,
        saturate: 104,
      };
    case "standard":
    default:
      return {
        blurPx: 0.7,
        overlayAlpha: 0.18,
        noiseAlpha: 0.04,
        noiseAmplitude: 48,
        contrast: 106,
        saturate: 103,
      };
  }
}

function createCanvasEl(width: number, height: number): HTMLCanvasElement {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("脱AI処理の画像サイズが不正です。");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas の描画コンテキストを取得できませんでした。");
  }
  return ctx;
}

/** 入力（画像 or Canvas）の実ピクセルサイズを取得する。 */
function sourceSize(source: HTMLImageElement | HTMLCanvasElement): {
  width: number;
  height: number;
} {
  if (source instanceof HTMLCanvasElement) {
    return { width: source.width, height: source.height };
  }
  return {
    width: source.naturalWidth || source.width,
    height: source.naturalHeight || source.height,
  };
}

/**
 * 写真粒子（ノイズ）のオーバーレイ Canvas を作る。
 * 中間グレー(128)を中心に微小に揺らしたグレースケールノイズ。
 * overlay 合成 + 低不透明度で重ねると、つるつる面に軽い粒状感が乗る。
 */
export function createDeAiNoiseOverlay(
  width: number,
  height: number,
  strength: IeiPhotoDeAiStrength,
): HTMLCanvasElement {
  const { noiseAmplitude } = getDeAiSettings(strength);
  const canvas = createCanvasEl(width, height);
  const ctx = get2d(canvas);
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    let v = 128 + (Math.random() * 2 - 1) * noiseAmplitude;
    if (v < 0) v = 0;
    else if (v > 255) v = 255;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * 脱AI処理を適用した Canvas を返す（入力は破壊しない）。
 * 1. 元画像を描画
 * 2. 弱ぼかし画像を低不透明度で重ねる（つるつる感を弱める）
 * 3. 写真粒子を軽く重ねる（模様っぽさを散らす）
 * 4. コントラスト/彩度を軽く戻して眠くなりすぎを防ぐ
 *
 * ガイド線などは一切焼き込まない（純粋に画素処理のみ）。
 */
export function applyDeAiEffectToImage(
  image: HTMLImageElement | HTMLCanvasElement,
  strength: IeiPhotoDeAiStrength,
): HTMLCanvasElement {
  const { width, height } = sourceSize(image);
  const settings = getDeAiSettings(strength);

  // 1. ベース描画
  const canvas = createCanvasEl(width, height);
  const ctx = get2d(canvas);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);

  // 2. 弱ぼかしを低不透明度で合成
  const blurCanvas = createCanvasEl(width, height);
  const bctx = get2d(blurCanvas);
  bctx.filter = `blur(${settings.blurPx}px)`;
  bctx.drawImage(image, 0, 0, width, height);
  bctx.filter = "none";
  ctx.globalAlpha = settings.overlayAlpha;
  ctx.drawImage(blurCanvas, 0, 0);
  ctx.globalAlpha = 1;

  // 3. 写真粒子（ノイズ）を overlay 合成で軽く重ねる
  const noise = createDeAiNoiseOverlay(width, height, strength);
  ctx.globalAlpha = settings.noiseAlpha;
  ctx.globalCompositeOperation = "overlay";
  ctx.drawImage(noise, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  // 4. コントラスト/彩度を軽く戻す（最終パス）
  const finalCanvas = createCanvasEl(width, height);
  const fctx = get2d(finalCanvas);
  fctx.filter = `contrast(${settings.contrast}%) saturate(${settings.saturate}%)`;
  fctx.drawImage(canvas, 0, 0);
  fctx.filter = "none";
  return finalCanvas;
}

/** 脱AI処理後の Canvas を PNG Blob 化する。 */
export function deAiCanvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("脱AI処理画像の書き出しに失敗しました。"));
      }
    }, "image/png");
  });
}
