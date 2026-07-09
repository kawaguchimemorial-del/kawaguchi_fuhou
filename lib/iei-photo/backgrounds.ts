/**
 * 背景タイプの定義（AI生成テーマ + UI スウォッチ + Canvas fallback）
 *
 * 現行UIでは、別の背景画像を切り抜き合成せず、選択テーマを AI 画像生成へ渡す。
 * Canvas 側の色は、AI生成前プレビューや余白が見えた場合の fallback として使う。
 */

import type {
  IeiPhotoBackgroundSettings,
  IeiPhotoBackgroundType,
  IeiPhotoExportKind,
} from "./types";

export const IEI_PHOTO_GRADIENT_CAPABLE_BACKGROUNDS = [
  "light_gray",
  "warm_beige",
  "pale_blue",
  "pale_pink",
] as const satisfies readonly IeiPhotoBackgroundType[];

export function supportsBackgroundGradient(
  type: IeiPhotoBackgroundType,
): boolean {
  return IEI_PHOTO_GRADIENT_CAPABLE_BACKGROUNDS.includes(
    type as (typeof IEI_PHOTO_GRADIENT_CAPABLE_BACKGROUNDS)[number],
  );
}

/** UI 表示用（表示順・ラベル・スウォッチCSS）。 */
export const IEI_PHOTO_BACKGROUND_OPTIONS: {
  type: IeiPhotoBackgroundType;
  label: string;
  swatchCss: string;
}[] = [
  {
    type: "sky",
    label: "空",
    swatchCss: "linear-gradient(180deg, #b9d7f2 0%, #eef7ff 55%, #ffffff 100%)",
  },
  { type: "light_gray", label: "グレー", swatchCss: "#eef0f3" },
  { type: "warm_beige", label: "ベージュ", swatchCss: "#f3eadf" },
  { type: "pale_blue", label: "ブルー", swatchCss: "#dfeef9" },
  { type: "pale_pink", label: "ピンク", swatchCss: "#f8e2ea" },
  {
    type: "auto",
    label: "お任せ",
    swatchCss:
      "linear-gradient(135deg, #dfe7f3 0%, #f3eadf 42%, #f8e2ea 100%)",
  },
];

/** 単色タイプの塗り色（Canvas fallback 用）。photo と gradient は旧UI互換値。 */
export const IEI_PHOTO_BACKGROUND_SOLID_COLORS: Record<
  Exclude<IeiPhotoBackgroundType, "gradient" | "photo">,
  string
> = {
  white: "#ffffff",
  sky: "#eef7ff",
  light_gray: "#eef0f3",
  warm_beige: "#f3eadf",
  pale_blue: "#dfeef9",
  pale_pink: "#f8e2ea",
  auto: "#f3f1ec",
};

/** グレー/ベージュ/ブルー/ピンクのグラデーション fallback 色。 */
export const IEI_PHOTO_BACKGROUND_COLOR_GRADIENTS: Partial<
  Record<IeiPhotoBackgroundType, { from: string; to: string }>
> = {
  light_gray: { from: "#f7f8fa", to: "#dfe3e8" },
  warm_beige: { from: "#fbf5ec", to: "#e8dac8" },
  pale_blue: { from: "#eef8ff", to: "#cddff1" },
  pale_pink: { from: "#fff0f5", to: "#efd0dc" },
};

/** 出力種別 → 背景画像の向き。 */
export function orientationForKind(
  kind: IeiPhotoExportKind,
): "vertical" | "wide" {
  return kind === "monitor169" ? "wide" : "vertical";
}

/** 画像系の背景タイプか（旧UI互換の写真背景のみ）。 */
export function isPhotoBackgroundType(
  type: IeiPhotoBackgroundType,
): type is "photo" {
  return type === "photo";
}

/**
 * 旧背景画像合成方式の互換関数。
 * 現行仕様では背景画像ファイルを読み込まず、AIに背景を生成させるため常に null を返す。
 */
export function backgroundImageSrc(
  _settings: IeiPhotoBackgroundSettings,
  _orientation: "vertical" | "wide",
): string | null {
  void _settings;
  void _orientation;
  return null;
}

/** グラデーションの上端→下端カラー（Canvas 用） */
export const IEI_PHOTO_BACKGROUND_GRADIENT = {
  from: "#eef2f7",
  to: "#d9e2ec",
};

/** 既定の背景設定（AIにお任せ） */
export const IEI_PHOTO_DEFAULT_BACKGROUND: IeiPhotoBackgroundSettings = {
  type: "auto",
};
