/**
 * 台本生成ロジック（固定テンプレート方式・AIなし）。
 *
 * generateFuneralScript(form) は、式種別に応じた進行フロー（flows.ts）を辿り、
 * 進行オプションの有無で各セクションを出し分け、固定テンプレート（phrases.ts）に
 * フォーム値を差し込んだ FuneralScriptSection[] を返す。
 */

import type { FlowStep, FlowStepKey } from "./flows";
import { getFlow, isCombinedWakeFuneral } from "./flows";
import {
  aiNarration,
  buildScriptContext,
  candleOffering,
  chiefMournerGreeting,
  closingNarrationMerged,
  condolenceAddress,
  crematoriumGuidance,
  departure,
  farewellPreparation,
  flowerOffering,
  incense,
  memorialService,
  officiantEntrance,
  officiantExit,
  openingBuddhist,
  openingNonReligious,
  preAnnouncementBuddhistFuneral,
  preAnnouncementBuddhistWake,
  preAnnouncementNonReligious,
  silentPrayer,
  telegram,
  type ScriptContext,
  type SectionDraft,
} from "./phrases";
import type { FuneralScriptFormData, FuneralScriptSection } from "./types";

/** フローのステップ1つを SectionDraft（または null=スキップ）に変換 */
function buildStep(
  key: FlowStepKey,
  ctx: ScriptContext,
  form: FuneralScriptFormData,
): SectionDraft | null {
  const isWake = form.ceremonyType === "buddhist_wake";
  const isNonReligious = form.ceremonyType === "non_religious_funeral";

  switch (key) {
    case "pre_announcement":
      if (isNonReligious) return preAnnouncementNonReligious(ctx);
      return isWake
        ? preAnnouncementBuddhistWake(ctx)
        : preAnnouncementBuddhistFuneral(form);

    case "opening":
      return isNonReligious
        ? openingNonReligious(ctx)
        : openingBuddhist(ctx, form);

    case "officiant_entrance":
      return officiantEntrance();

    case "officiant_exit":
      return officiantExit();

    case "narration_opening":
      return aiNarration(ctx, form, {
        title: "開式ナレーション",
        phase: "opening",
      });

    case "narration_main":
      return aiNarration(ctx, form, {
        title: "メインナレーション",
        phase: "main",
      });

    case "closing_merged":
      return closingNarrationMerged(ctx, form);

    case "incense":
      return incense(ctx);

    case "offering_flower":
      return flowerOffering(ctx);

    case "offering_candle":
      return candleOffering(ctx);

    case "offering_incense":
      return incense(ctx);

    case "silent_prayer":
      return silentPrayer(ctx);

    case "condolence_address":
      return condolenceAddress();

    case "telegram":
      return telegram();

    case "chief_mourner_greeting":
      return chiefMournerGreeting(ctx);

    case "memorial_service":
      return memorialService();

    case "farewell_preparation":
      return farewellPreparation(ctx);

    case "departure":
      return departure(ctx);

    case "crematorium_guidance":
      return crematoriumGuidance(ctx);

    default:
      return null;
  }
}

/** 単一フローを辿ってセクション配列を生成する。 */
function generateSingleFlow(
  form: FuneralScriptFormData,
): FuneralScriptSection[] {
  const ctx = buildScriptContext(form);
  const flow = getFlow(form.ceremonyType);

  const sections: FuneralScriptSection[] = [];
  let index = 0;

  for (const step of flow as FlowStep[]) {
    if (step.when && !step.when(form)) continue;

    const draft = buildStep(step.key, ctx, form);
    if (!draft) continue;
    // 本文が空のセクションは出力しない（空欄オプションの組み合わせ対策）
    if (!draft.body.trim()) continue;

    index += 1;
    sections.push({
      id: `${form.ceremonyType}-${String(index).padStart(2, "0")}-${step.key}`,
      ...draft,
    });
  }

  return sections;
}

/** 日付の見出し（区切り）セクション。 */
function dayDivider(id: string, title: string, body: string): FuneralScriptSection {
  return { id, title, kind: "note", body };
}

/**
 * 進行フローを台本セクション配列へ変換する。
 * 「通夜・告別式」は通夜フローと告別式フローを区切り見出し付きで連結する。
 */
export function generateFuneralScript(
  form: FuneralScriptFormData,
): FuneralScriptSection[] {
  if (isCombinedWakeFuneral(form.ceremonyType)) {
    const wake = generateSingleFlow({ ...form, ceremonyType: "buddhist_wake" });
    const funeral = generateSingleFlow({
      ...form,
      ceremonyType: "buddhist_funeral",
    });
    return [
      dayDivider(
        "combined-divider-wake",
        "【1日目】通夜",
        "ここから通夜の進行です。",
      ),
      ...wake,
      dayDivider(
        "combined-divider-funeral",
        "【2日目】葬儀・告別式",
        "ここから葬儀・告別式の進行です。",
      ),
      ...funeral,
    ];
  }

  return generateSingleFlow(form);
}
