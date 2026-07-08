/**
 * 式種別ごとの基本進行フロー定義。
 *
 * 出典: docs/funeral-script/source-extraction/ceremony-flows.md。
 * 各ステップは「セクション種別」と「出力条件（when）」を持つ。
 * 条件付きステップは進行オプションの有無で出し分ける（空のセクションは出さない）。
 */

import type {
  FuneralScriptCeremonyType,
  FuneralScriptFormData,
} from "./types";

/** フローのステップ識別子（generator が phrases の builder に振り分ける） */
export type FlowStepKey =
  | "pre_announcement"
  | "opening"
  | "officiant_entrance"
  | "officiant_exit"
  | "narration_opening" // 開式ナレーション（AI）
  | "narration_main" // メインナレーション（AI・無宗教）
  | "closing_merged" // 閉式前ナレーション＋閉式（統合・AI）
  | "incense" // 焼香（仏式・必須）
  | "offering_flower" // 献花（無宗教）
  | "offering_candle" // 献灯（無宗教）
  | "offering_incense" // 焼香（無宗教・任意）
  | "silent_prayer"
  | "condolence_address"
  | "telegram"
  | "chief_mourner_greeting"
  | "memorial_service"
  | "farewell_preparation"
  | "departure"
  | "crematorium_guidance";

export type FlowStep = {
  key: FlowStepKey;
  /** 省略時は常に出力。指定時は true のときのみ出力 */
  when?: (form: FuneralScriptFormData) => boolean;
};

const buddhistWake: FlowStep[] = [
  { key: "pre_announcement" },
  { key: "narration_opening" },
  { key: "officiant_entrance" },
  { key: "opening" },
  { key: "incense" },
  { key: "telegram", when: (f) => f.hasTelegram },
  { key: "officiant_exit" },
  { key: "chief_mourner_greeting", when: (f) => f.hasChiefMournerGreeting },
  { key: "closing_merged" }, // 閉式前ナレーション＋閉式（統合）
];

const buddhistFuneral: FlowStep[] = [
  { key: "pre_announcement" },
  { key: "narration_opening" },
  { key: "officiant_entrance" },
  { key: "opening" },
  { key: "condolence_address", when: (f) => f.hasCondolenceAddress },
  { key: "telegram", when: (f) => f.hasTelegram },
  { key: "incense" },
  { key: "memorial_service", when: (f) => f.hasMemorialService },
  { key: "officiant_exit" },
  { key: "chief_mourner_greeting", when: (f) => f.hasChiefMournerGreeting },
  { key: "closing_merged" }, // 閉式前ナレーション＋閉式（統合）
  { key: "farewell_preparation", when: (f) => f.hasFarewellPreparation },
  { key: "departure", when: (f) => f.hasDeparture },
  { key: "crematorium_guidance", when: (f) => f.hasCrematoriumGuidance },
];

const nonReligiousFuneral: FlowStep[] = [
  { key: "pre_announcement" },
  { key: "silent_prayer", when: (f) => f.hasSilentPrayer },
  { key: "opening" },
  { key: "narration_main" },
  // お供えは「献花 → 献灯 → 焼香」の順で、有効なものを順番に案内する
  { key: "offering_flower", when: (f) => f.hasFlowerOffering },
  { key: "offering_candle", when: (f) => f.hasCandleOffering },
  { key: "offering_incense", when: (f) => f.hasIncense },
  { key: "condolence_address", when: (f) => f.hasCondolenceAddress },
  { key: "telegram", when: (f) => f.hasTelegram },
  { key: "chief_mourner_greeting", when: (f) => f.hasChiefMournerGreeting },
  { key: "closing_merged" }, // 閉式前ナレーション＋閉式（統合）
  { key: "farewell_preparation", when: (f) => f.hasFarewellPreparation },
  { key: "departure", when: (f) => f.hasDeparture },
  { key: "crematorium_guidance", when: (f) => f.hasCrematoriumGuidance },
];

const FLOWS: Record<FuneralScriptCeremonyType, FlowStep[]> = {
  buddhist_wake: buddhistWake,
  // 通夜・告別式は generator が「通夜フロー＋告別式フロー」を連結して生成（特例）
  buddhist_wake_funeral: [],
  buddhist_funeral: buddhistFuneral, // 一日葬（告別式のみ）も同フロー
  non_religious_funeral: nonReligiousFuneral,
};

export function getFlow(ceremonyType: FuneralScriptCeremonyType): FlowStep[] {
  return FLOWS[ceremonyType];
}

/** 式種別の日本語ラベル */
export const CEREMONY_TYPE_LABELS: Record<
  FuneralScriptCeremonyType,
  string
> = {
  buddhist_wake: "仏式 通夜のみ",
  buddhist_wake_funeral: "仏式 通夜・告別式",
  buddhist_funeral: "仏式 一日葬（告別式のみ）",
  non_religious_funeral: "無宗教 告別式",
};

/** 通夜・告別式（統合）かどうか */
export function isCombinedWakeFuneral(
  ceremonyType: FuneralScriptCeremonyType,
): boolean {
  return ceremonyType === "buddhist_wake_funeral";
}
