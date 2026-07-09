/**
 * AI生成モードのルール定義
 *
 * ここは「各AI生成モードで何を許可し、何を禁止するか」をコード上で明示する場所です。
 * 実際の生成エンジン（将来の外部GPU / ComfyUI / 画像生成API 等）はこのルールを参照して
 * 動作する想定です。現状の MVP は定義のみで、人物の再生成は行いません。
 *
 * 重要な品質方針:
 * - 標準生成（AI標準生成）では人物を勝手に別人化させない。顔・肌・髪・服の特徴を保持する。
 * - AI肖像生成は、元写真の白飛びや破損が大きい場合の最終手段としてのみ使用する。
 * - まず基準写真を1枚生成し、手札・四つ切り・16:9 はそこから切り出す。
 */

import type { IeiPhotoMode } from "./types";

/** モードごとに許可される操作・禁止される操作・注意点を定義する。 */
export type IeiPhotoModeRule = {
  mode: IeiPhotoMode;
  /** UI 表示用の名称 */
  label: string;
  /** UI 表示用の概要 */
  summary: string;
  /** 許可される操作 */
  allowedOperations: string[];
  /** 明確に禁止される操作 */
  forbiddenOperations: string[];
  /** 保護すべき人物特徴 */
  protectedFeatures: string[];
  /** このモードを使う条件・前提 */
  usageConditions: string[];
  /** 明示的な許可が必要かどうか */
  requiresExplicitConsent: boolean;
};

export const IEI_PHOTO_MODE_RULES: Record<IeiPhotoMode, IeiPhotoModeRule> = {
  AI_STANDARD: {
    mode: "AI_STANDARD",
    label: "AI標準生成",
    summary:
      "人物の特徴を保持しながら、背景差し替え・明るさ・色味・構図を整える標準モード。",
    allowedOperations: [
      "背景差し替え・整え",
      "明るさ補正",
      "色味補正",
      "コントラスト調整",
      "構図・トリミング調整",
      "サイズ変更",
    ],
    forbiddenOperations: [
      "人物（顔・肌・髪・服）の別人化",
      "顔のパーツの描き直し",
      "本人らしさを損なう加工",
    ],
    protectedFeatures: ["顔", "肌", "髪", "服", "ほくろ", "シワ", "眼鏡"],
    usageConditions: ["元写真の状態が比較的良好な場合の標準モード"],
    requiresExplicitConsent: false,
  },

  AI_ADVANCED: {
    mode: "AI_ADVANCED",
    label: "高度AI補正",
    summary:
      "白飛び・強い影・背景境界・服まわりなど、通常処理では難しい部分をAIで補正するモード。",
    allowedOperations: [
      "白飛びの補正",
      "強い影の補正",
      "背景境界の自然化",
      "服まわりの整え",
      "照明の自然化",
    ],
    forbiddenOperations: [
      "顔の重要特徴の改変",
      "本人らしさを損なう人物の作り替え",
    ],
    protectedFeatures: [
      "ほくろ",
      "イボ",
      "シワ",
      "眼鏡",
      "目",
      "口",
      "髪",
      "服の質感",
    ],
    usageConditions: [
      "AI標準生成では背景・照明・白飛びが整えきれない場合",
    ],
    requiresExplicitConsent: false,
  },

  AI_PORTRAIT: {
    mode: "AI_PORTRAIT",
    label: "AI肖像生成",
    summary:
      "元写真の状態が悪い場合に、人物も含めて遺影写真として自然に生成する最終手段のモード。",
    allowedOperations: [
      "元写真を基にした人物を含む肖像の生成（明示許可時のみ）",
    ],
    forbiddenOperations: [
      "許可なく人物を作り替えること",
      "本人らしさを損なう創作的な改変",
    ],
    protectedFeatures: ["本人らしさ（顔の同一性）"],
    usageConditions: [
      "元写真の白飛びや破損が大きく、他のモードでは基準写真を作れない場合のみ",
      "利用には明示的な許可が必要",
    ],
    requiresExplicitConsent: true,
  },
};

/** モード一覧（UI のセレクタ表示順） */
export const IEI_PHOTO_MODE_ORDER: IeiPhotoMode[] = [
  "AI_STANDARD",
  "AI_ADVANCED",
  "AI_PORTRAIT",
];

/** 既定モード */
export const IEI_PHOTO_DEFAULT_MODE: IeiPhotoMode = "AI_STANDARD";

/** UI に表示する共通の注意書き。 */
export const IEI_PHOTO_NOTICES: string[] = [
  "AI標準生成では人物（顔・肌・髪・服）の特徴をできるだけ保持し、勝手に別人化させません。",
  "AI肖像生成は、元写真の白飛びや破損が大きい場合の最終手段です。",
  "まず基準写真を1枚生成し、手札・四つ切り・16:9 はそこから切り出します。",
];
