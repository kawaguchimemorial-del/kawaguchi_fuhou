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

/** 単色系のみ、同系色グラデーションへの切替に対応する（情景系はAIが情景を描くため対象外）。 */
export const IEI_PHOTO_GRADIENT_CAPABLE_BACKGROUNDS = [
  "light_gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "pale_blue",
  "purple",
  "pale_pink",
  "warm_beige",
] as const satisfies readonly IeiPhotoBackgroundType[];

export function supportsBackgroundGradient(
  type: IeiPhotoBackgroundType,
): boolean {
  return IEI_PHOTO_GRADIENT_CAPABLE_BACKGROUNDS.includes(
    type as (typeof IEI_PHOTO_GRADIENT_CAPABLE_BACKGROUNDS)[number],
  );
}

/** UI 表示用（表示順・ラベル・スウォッチCSS）。前半9色が単色系、後半10種が情景系。 */
export const IEI_PHOTO_BACKGROUND_OPTIONS: {
  type: IeiPhotoBackgroundType;
  label: string;
  swatchCss: string;
}[] = [
  // 単色系
  { type: "white", label: "ホワイト", swatchCss: "linear-gradient(180deg, #ffffff 0%, #f2f3f5 100%)" },
  { type: "light_gray", label: "グレー", swatchCss: "#eef0f3" },
  { type: "brown", label: "ブラウン", swatchCss: "#e7dbcd" },
  { type: "orange", label: "オレンジ", swatchCss: "#f7e2cf" },
  { type: "yellow", label: "イエロー", swatchCss: "#f8f0cf" },
  { type: "green", label: "グリーン", swatchCss: "#e2eeda" },
  { type: "pale_blue", label: "ブルー", swatchCss: "#dfeef9" },
  { type: "purple", label: "パープル", swatchCss: "#e8e2f2" },
  { type: "pale_pink", label: "ピンク", swatchCss: "#f8e2ea" },
  // 情景系
  { type: "awa_hikari", label: "淡光", swatchCss: "linear-gradient(180deg, #ffffff 0%, #f6f7f9 60%, #ebedf0 100%)" },
  { type: "gin_setsu", label: "銀雪", swatchCss: "linear-gradient(180deg, #f8fafc 0%, #e2e8ee 100%)" },
  { type: "kohaku_kasumi", label: "琥珀霞", swatchCss: "linear-gradient(180deg, #f7ecdc 0%, #dfc7a4 100%)" },
  { type: "kouyou", label: "紅葉", swatchCss: "linear-gradient(180deg, #f9e3d0 0%, #e5ab82 100%)" },
  { type: "himawari", label: "向日葵", swatchCss: "linear-gradient(180deg, #fdf4d2 0%, #f0d585 100%)" },
  { type: "wakaba_gumo", label: "若葉雲", swatchCss: "linear-gradient(180deg, #f1f8ea 0%, #cbe0bb 100%)" },
  { type: "sumizora", label: "澄空", swatchCss: "linear-gradient(180deg, #cbe4f8 0%, #eef7ff 60%, #ffffff 100%)" },
  { type: "awafuji_kasumi", label: "淡藤霞", swatchCss: "linear-gradient(180deg, #efe9f7 0%, #d3c7e7 100%)" },
  { type: "sakura_gumo", label: "桜雲", swatchCss: "linear-gradient(180deg, #fdeff4 0%, #f4cdda 100%)" },
  { type: "sakura", label: "桜", swatchCss: "linear-gradient(180deg, #fbe2ea 0%, #f0bacd 100%)" },
];

/** 単色タイプの塗り色（Canvas fallback 用）。photo と gradient は旧UI互換値。 */
export const IEI_PHOTO_BACKGROUND_SOLID_COLORS: Record<
  Exclude<IeiPhotoBackgroundType, "gradient" | "photo">,
  string
> = {
  // 単色系
  white: "#ffffff",
  light_gray: "#eef0f3",
  brown: "#e7dbcd",
  orange: "#f7e2cf",
  yellow: "#f8f0cf",
  green: "#e2eeda",
  pale_blue: "#dfeef9",
  purple: "#e8e2f2",
  pale_pink: "#f8e2ea",
  // 情景系（AI生成前プレビュー用の代表色）
  awa_hikari: "#f6f7f9",
  gin_setsu: "#e9eef3",
  kohaku_kasumi: "#ecd9bd",
  kouyou: "#eec5a6",
  himawari: "#f6e5ab",
  wakaba_gumo: "#dcebd0",
  sumizora: "#e0f0fc",
  awafuji_kasumi: "#e2d9ee",
  sakura_gumo: "#f8dde7",
  sakura: "#f5cedb",
  // 旧データ互換
  sky: "#eef7ff",
  warm_beige: "#f3eadf",
  auto: "#f3f1ec",
};

/** グレー/ベージュ/ブルー/ピンクのグラデーション fallback 色。 */
export const IEI_PHOTO_BACKGROUND_COLOR_GRADIENTS: Partial<
  Record<IeiPhotoBackgroundType, { from: string; to: string }>
> = {
  light_gray: { from: "#f7f8fa", to: "#dfe3e8" },
  brown: { from: "#f7f0e7", to: "#dbc9b3" },
  orange: { from: "#fdf1e6", to: "#eecdae" },
  yellow: { from: "#fdf8e4", to: "#eee1ab" },
  green: { from: "#f2f8ed", to: "#d3e5c7" },
  pale_blue: { from: "#eef8ff", to: "#cddff1" },
  purple: { from: "#f4f0fa", to: "#d8cfe9" },
  pale_pink: { from: "#fff0f5", to: "#efd0dc" },
  warm_beige: { from: "#fbf5ec", to: "#e8dac8" },
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

/** 既定の背景設定（一覧の先頭＝ホワイト） */
export const IEI_PHOTO_DEFAULT_BACKGROUND: IeiPhotoBackgroundSettings = {
  type: "white",
};
