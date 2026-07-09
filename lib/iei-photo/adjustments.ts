/**
 * 手動補正（明るさ・コントラスト・彩度・拡大率・位置）の設定値
 *
 * すべてブラウザ内 Canvas で適用する前提の値です。AI 生成・顔再生成・AI 補正は行いません。
 * UI（スライダー）と Canvas 書き出しの双方がここを単一の情報源として参照します。
 */

import type { IeiPhotoAdjustments } from "./types";

export type IeiPhotoAdjustmentKey = keyof IeiPhotoAdjustments;

/** スライダーの範囲（min / max / step）。クランプにも使用する。 */
export const IEI_PHOTO_ADJUSTMENT_RANGES: Record<
  IeiPhotoAdjustmentKey,
  { min: number; max: number; step: number }
> = {
  brightness: { min: 70, max: 130, step: 1 },
  contrast: { min: 70, max: 130, step: 1 },
  saturation: { min: 70, max: 130, step: 1 },
  zoom: { min: 50, max: 180, step: 1 },
  offsetX: { min: -50, max: 50, step: 1 },
  offsetY: { min: -50, max: 50, step: 1 },
};

/** 初期値（無補正・中央 cover・等倍）。 */
export const IEI_PHOTO_DEFAULT_ADJUSTMENTS: IeiPhotoAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  zoom: 100,
  offsetX: 0,
  offsetY: 0,
};

/** UI スライダーの表示定義（表示順）。 */
export const IEI_PHOTO_ADJUSTMENT_SLIDERS: {
  key: IeiPhotoAdjustmentKey;
  label: string;
  unit: string;
}[] = [
  { key: "brightness", label: "明るさ", unit: "%" },
  { key: "contrast", label: "コントラスト", unit: "%" },
  { key: "saturation", label: "彩度", unit: "%" },
  { key: "zoom", label: "拡大率", unit: "%" },
  { key: "offsetX", label: "横位置", unit: "" },
  { key: "offsetY", label: "縦位置", unit: "" },
];

/**
 * 自動補正プリセット（簡易）。手動補正と併用可能。
 * 基準100からの差分として手動値に加算する（既定の手動値なら結果はこの値そのもの）。
 */
export const IEI_PHOTO_AUTO_CORRECT_PRESET = {
  brightness: 106,
  contrast: 104,
  saturation: 102,
} as const;

function clampValue(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

/**
 * 自動補正を手動補正値に重ねた結果を返す（明るさ・コントラスト・彩度に差分を加算）。
 * 範囲外はクランプ。zoom / offset は変更しない。
 */
export function applyAutoCorrect(
  adjustments: IeiPhotoAdjustments,
): IeiPhotoAdjustments {
  return clampAdjustments({
    ...adjustments,
    brightness:
      adjustments.brightness + (IEI_PHOTO_AUTO_CORRECT_PRESET.brightness - 100),
    contrast:
      adjustments.contrast + (IEI_PHOTO_AUTO_CORRECT_PRESET.contrast - 100),
    saturation:
      adjustments.saturation + (IEI_PHOTO_AUTO_CORRECT_PRESET.saturation - 100),
  });
}

/** 調整値を範囲内に収め、欠損は既定値で補う。 */
export function clampAdjustments(
  adjustments: Partial<IeiPhotoAdjustments> | undefined,
): IeiPhotoAdjustments {
  const source = { ...IEI_PHOTO_DEFAULT_ADJUSTMENTS, ...(adjustments ?? {}) };
  return {
    brightness: clampValue(
      source.brightness,
      IEI_PHOTO_ADJUSTMENT_RANGES.brightness.min,
      IEI_PHOTO_ADJUSTMENT_RANGES.brightness.max,
    ),
    contrast: clampValue(
      source.contrast,
      IEI_PHOTO_ADJUSTMENT_RANGES.contrast.min,
      IEI_PHOTO_ADJUSTMENT_RANGES.contrast.max,
    ),
    saturation: clampValue(
      source.saturation,
      IEI_PHOTO_ADJUSTMENT_RANGES.saturation.min,
      IEI_PHOTO_ADJUSTMENT_RANGES.saturation.max,
    ),
    zoom: clampValue(
      source.zoom,
      IEI_PHOTO_ADJUSTMENT_RANGES.zoom.min,
      IEI_PHOTO_ADJUSTMENT_RANGES.zoom.max,
    ),
    offsetX: clampValue(
      source.offsetX,
      IEI_PHOTO_ADJUSTMENT_RANGES.offsetX.min,
      IEI_PHOTO_ADJUSTMENT_RANGES.offsetX.max,
    ),
    offsetY: clampValue(
      source.offsetY,
      IEI_PHOTO_ADJUSTMENT_RANGES.offsetY.min,
      IEI_PHOTO_ADJUSTMENT_RANGES.offsetY.max,
    ),
  };
}
