/**
 * 出力サイズ定義
 *
 * 方針: まず「基準写真」を1枚作り、手札・四つ切り・16:9 はそこから派生（切り出し/配置）させます。
 * 元画像から直接3種類を作るのではなく、基準写真を親データとして扱います。
 *
 * すべてブラウザ内 Canvas での「トリミング・サイズ変更・配置」のみで、
 * AI 生成・顔再生成・AI 補正は一切行いません（元写真のピクセルをそのまま使用）。
 */

import type { IeiPhotoExportKind } from "./types";

export type IeiPhotoExportSize = {
  kind: IeiPhotoExportKind;
  label: string;
  description: string;
  /** 縦横比（width:height）。UI 表示・トリミングの目安に使う。 */
  aspectRatio: string;
  /** 出力ピクセル（Canvas 書き出しで使用） */
  pixelGuide: { width: number; height: number };
};

export const IEI_PHOTO_EXPORT_SIZES: Record<
  IeiPhotoExportKind,
  IeiPhotoExportSize
> = {
  base: {
    kind: "base",
    label: "基準写真",
    description:
      "最初に作成する縦長 3:4 の基準写真。中央基準でトリミングし、他のサイズはここから派生します。",
    aspectRatio: "3:4",
    pixelGuide: { width: 1800, height: 2400 },
  },
  tesatsu: {
    kind: "tesatsu",
    label: "手札",
    description: "基準写真から縦長で書き出す手札サイズ。受付や手元用。",
    aspectRatio: "7:10",
    pixelGuide: { width: 1051, height: 1500 },
  },
  yotsugiri: {
    kind: "yotsugiri",
    label: "四つ切り",
    description: "基準写真から縦長で書き出す四つ切りサイズ。祭壇用の標準的な遺影サイズ。",
    aspectRatio: "5:6",
    pixelGuide: { width: 3000, height: 3600 },
  },
  monitor169: {
    kind: "monitor169",
    label: "16:9モニター用",
    description:
      "AI生成後は16:9親画像をそのまま使用。未AI時は基準写真を中央配置して書き出します。",
    aspectRatio: "16:9",
    pixelGuide: { width: 1920, height: 1080 },
  },
};

/** 出力ボタンの表示順 */
export const IEI_PHOTO_EXPORT_ORDER: IeiPhotoExportKind[] = [
  "base",
  "tesatsu",
  "yotsugiri",
  "monitor169",
];

/** 出力ファイル名 */
export const IEI_PHOTO_EXPORT_FILENAMES: Record<IeiPhotoExportKind, string> = {
  base: "iei-base.jpg",
  tesatsu: "iei-tesatsu.jpg",
  yotsugiri: "iei-yotsugiri.jpg",
  monitor169: "iei-monitor-16x9.jpg",
};
