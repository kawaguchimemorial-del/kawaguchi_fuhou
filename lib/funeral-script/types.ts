/**
 * 葬儀司会台本作成（MVP）の型定義。
 *
 * 方針:
 * - 本機能は OpenAI 等のAI生成を行わず、固定テンプレート（phrases.ts）＋進行フロー（flows.ts）から
 *   台本セクション配列を組み立てる（generator.ts）。
 * - ナレーション系（AI生成予定箇所）は kind: "ai_placeholder" として出力し、次フェーズでAI生成に差し替える。
 * - 元データは docs/funeral-script/source-extraction/ の抽出Markdownを汎用化したもの。元画像には依存しない。
 */

export type FuneralScriptCeremonyType =
  | "buddhist_wake" // 仏式 通夜のみ
  | "buddhist_wake_funeral" // 仏式 通夜・告別式（1台本に通夜＋告別式を収録）
  | "buddhist_funeral" // 仏式 一日葬（告別式のみ・通夜なし）
  | "non_religious_funeral"; // 無宗教 告別式

export type FuneralScriptTone =
  | "standard" // 標準
  | "formal" // 厳粛
  | "gentle" // やわらかい
  | "family"; // 家族葬向け

export type FuneralScriptLength =
  | "short" // 短め
  | "standard" // 標準
  | "detailed" // 丁寧
  | "most_detailed"; // 最丁寧（季節感・ショートフレーズ活用の上位生成）

/** 通夜の会葬者の様子（告別式で通夜に言及する素材。"" は言及しない） */
export type FuneralScriptWakeAttendance =
  | "" // 言及しない（既定）
  | "many" // 大勢の会葬者
  | "more_than_expected" // 予想以上の会葬者
  | "family_centered" // 親族・親しい方中心
  | "heartfelt_small"; // 心のこもった少人数

export type FuneralScriptPrintSize =
  | "small" // 小さめ
  | "standard" // 標準
  | "large"; // 大きめ

export type FuneralScriptSectionKind =
  | "pre_announcement" // 開式前前説
  | "opening" // 開式の辞
  | "narration" // ナレーション（汎用・将来用）
  | "silent_prayer" // 黙祷（無宗教）
  | "officiant_entrance" // 導師入場
  | "incense" // 焼香案内
  | "flower_offering" // 献花案内
  | "candle_offering" // 献灯案内
  | "condolence_address" // 弔辞
  | "telegram" // 弔電紹介
  | "chief_mourner_greeting" // 喪主挨拶案内
  | "officiant_exit" // 導師退場
  | "closing_narration" // 閉式前ナレーション（汎用・将来用）
  | "farewell_preparation" // お別れ準備案内
  | "closing" // 閉式
  | "departure" // 出棺案内
  | "crematorium_guidance" // 火葬場同行案内
  | "memorial_service" // 初七日併修案内
  | "note" // 司会者メモ
  | "ai_placeholder"; // AI生成予定箇所

export type FuneralScriptSection = {
  id: string;
  title: string;
  kind: FuneralScriptSectionKind;
  body: string;
  note?: string; // 司会者メモ（読み上げ対象外）
  avoidPageBreak?: boolean; // A4印刷で途中改ページを避けたい短い案内
  aiGenerated?: boolean; // AI生成予定箇所（プレビューで区別表示）
  editable?: boolean; // 本文の編集を許可するか
};

export type FuneralScriptOriginalLetter = {
  id: "original-condolence-letter";
  title: string;
  body: string;
  aiGenerated?: boolean;
  updatedAt?: string;
};

export type FuneralScriptFormData = {
  // 基本情報
  deceasedName: string;
  birthDate?: string;
  deathDate?: string;
  age?: string;
  birthPlace?: string;
  ceremonyType: FuneralScriptCeremonyType;
  venueName?: string;
  startTime?: string;

  // 喪主・関係者
  chiefMournerName?: string;
  relationshipToChiefMourner?: string;
  templeName?: string;
  officiantName?: string;

  // 故人情報（AI生成の素材）
  hobbies?: string;
  portraitPhotoDescription?: string;
  education?: string;
  career?: string;
  workDescription?: string;
  communityActivities?: string;
  achievements?: string;
  familyStructure?: string;
  episodes?: string;
  personality?: string;

  // オリジナル会葬礼状（任意）
  hasOriginalCondolenceLetter: boolean;
  letterDate?: string;
  letterSenderAddress?: string;
  letterSenderName?: string;
  letterDeceasedRelationLabel?: string; // 例: 亡父 / 亡母 / 故
  letterTitle?: string; // 見出し・タイトル案
  letterMainMessage?: string; // 必ず伝えたいこと
  letterMemorableWords?: string; // 口癖・好きだった言葉
  letterFamilyInstructions?: string; // 喪主・ご家族からの修正指示
  letterPrintInstructions?: string; // 印刷会社への申し送り

  // 通夜の引き継ぎ（告別式で通夜に言及する素材。空なら一切言及しない）
  wakeAttendance?: FuneralScriptWakeAttendance; // 会葬者の様子
  wakeImpression?: string; // 通夜で印象的だったこと（自由記入）

  // 進行オプション
  hasCondolenceAddress: boolean; // 弔辞
  hasTelegram: boolean; // 弔電紹介
  hasChiefMournerGreeting: boolean; // 喪主挨拶
  hasMemorialService: boolean; // 初七日併修
  hasFarewellPreparation: boolean; // お別れ準備案内
  hasDeparture: boolean; // 出棺案内
  hasCrematoriumGuidance: boolean; // 火葬場同行案内
  hasFlowerOffering: boolean; // 献花（無宗教）
  hasCandleOffering: boolean; // 献灯（無宗教）
  hasIncense: boolean; // 焼香（無宗教の任意。仏式は常に実施）
  hasSilentPrayer: boolean; // 黙祷（無宗教）

  // 台本設定
  tone: FuneralScriptTone;
  length: FuneralScriptLength;
  printSize: FuneralScriptPrintSize;
};

// ──────────────────────────────────────────────────────────
// AIナレーション生成 API（/api/funeral-script/generate-narration）
// ──────────────────────────────────────────────────────────

/** リクエスト Body */
export type GenerateNarrationRequest = {
  form: FuneralScriptFormData;
  sections: FuneralScriptSection[];
  /** 生成対象（ai_placeholder セクションの id のみ有効） */
  targetSectionIds: string[];
};

/** 成功レスポンス（既存セクションIDに対応する生成結果のみ返す） */
export type GenerateNarrationResponse = {
  sections: {
    id: string;
    title: string;
    body: string;
    note?: string;
    aiGenerated: true;
  }[];
  warnings: string[];
};

export type GenerateOriginalLetterRequest = {
  form: FuneralScriptFormData;
  currentLetter?: FuneralScriptOriginalLetter | null;
};

export type GenerateOriginalLetterResponse = {
  letter: FuneralScriptOriginalLetter;
  warnings: string[];
};

/** エラーレスポンス */
export type GenerateNarrationError = {
  error: string;
  detail?: string;
};

// ──────────────────────────────────────────────────────────
// 台本の保存ファイル（通夜→告別式の引き継ぎ用・ブラウザ完結／DBなし）
// 通夜台本を1ファイルに書き出し、翌日読み込んで告別式台本に引き継ぐ。
// ──────────────────────────────────────────────────────────

/** 保存ファイルの判別子・スキーマバージョン */
export const FUNERAL_SCRIPT_FILE_KIND = "kawaguchi-funeral-script" as const;
export const FUNERAL_SCRIPT_FILE_VERSION = 1 as const;

/** 書き出し／読み込みする台本ファイルの中身 */
export type FuneralScriptSavedFile = {
  kind: typeof FUNERAL_SCRIPT_FILE_KIND;
  version: number;
  savedAt: string; // ISO 文字列（保存時刻）
  form: FuneralScriptFormData;
  sections: FuneralScriptSection[];
  originalLetter?: FuneralScriptOriginalLetter | null;
};
