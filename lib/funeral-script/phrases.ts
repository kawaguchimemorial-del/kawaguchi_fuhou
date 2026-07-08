/**
 * 葬儀司会台本の固定テンプレート（定型文）。
 *
 * 出典: docs/funeral-script/source-extraction/ の phrase-categories.md / ceremony-flows.md /
 *        extracted-all.md を、アプリ用の汎用定型文に整えたもの（本文の丸ごとコピーはしない）。
 *
 * 重要ルール:
 * - 個人情報・固有名詞は ScriptContext 経由で差し込む（直接埋め込まない）。
 * - 仏式専用の用語（導師・読経・焼香・通夜の儀 等）は仏式テンプレートにのみ用いる。
 * - 無宗教式では導師・読経などの仏式用語を出さない。
 * - 通夜の閉式は「終了」ではなく「区切り」の表現にする。
 */

import type {
  FuneralScriptCeremonyType,
  FuneralScriptFormData,
  FuneralScriptLength,
  FuneralScriptSection,
  FuneralScriptTone,
} from "./types";

/** id を除いたセクション素片（generator が id を付与する） */
export type SectionDraft = Omit<FuneralScriptSection, "id">;

/** テンプレートに差し込む文脈（フォームから導出） */
export type ScriptContext = {
  /** 「山田太郎様」/ 名前が無ければ「故人様」 */
  deceasedSama: string;
  /** 「故 山田太郎」/ 名前が無ければ「故人」 */
  deceasedKo: string;
  hasName: boolean;
  venueName?: string;
  startTime?: string;
  templeName?: string;
  officiantName?: string;
  chiefMournerName?: string;
  relationship?: string;
  tone: FuneralScriptTone;
  length: FuneralScriptLength;
};

const trimOrUndefined = (value?: string) => {
  const v = value?.trim();
  return v ? v : undefined;
};

/** フォームから差し込み用の文脈を作る（空欄は安全に補完） */
export function buildScriptContext(form: FuneralScriptFormData): ScriptContext {
  const name = trimOrUndefined(form.deceasedName);
  return {
    deceasedSama: name ? `${name}様` : "故人様",
    deceasedKo: name ? `故 ${name}` : "故人",
    hasName: Boolean(name),
    venueName: trimOrUndefined(form.venueName),
    startTime: trimOrUndefined(form.startTime),
    templeName: trimOrUndefined(form.templeName),
    officiantName: trimOrUndefined(form.officiantName),
    chiefMournerName: trimOrUndefined(form.chiefMournerName),
    relationship: trimOrUndefined(form.relationshipToChiefMourner),
    tone: form.tone,
    length: form.length,
  };
}

/** 喪主の呼称（続柄があれば併記）。喪主名が無ければ「喪主様」 */
const chiefMournerLabel = (ctx: ScriptContext) => {
  if (!ctx.chiefMournerName) return "喪主様";
  if (ctx.relationship) return `喪主 ${ctx.chiefMournerName}様（${ctx.relationship}）`;
  return `喪主 ${ctx.chiefMournerName}様`;
};

/** トーンに応じた閉式の結び一文（先頭の「本日は、」は各テンプレート側で付ける） */
const closingTail = (ctx: ScriptContext) => {
  switch (ctx.tone) {
    case "formal":
      return "ご参列を賜り、誠にありがとうございました。";
    case "gentle":
      return "あたたかいお見送りを、誠にありがとうございました。";
    case "family":
      return "ごゆっくりとお別れの時を、ありがとうございました。";
    default:
      return "誠にありがとうございました。";
  }
};

const lines = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join("\n");

// ──────────────────────────────────────────────────────────
// 開式前 前説
// ──────────────────────────────────────────────────────────

/** 仏式 通夜の前説 */
export function preAnnouncementBuddhistWake(ctx: ScriptContext): SectionDraft {
  return {
    title: "開式前 前説",
    kind: "pre_announcement",
    body: lines(
      "皆様、本日はお運びいただき、誠にありがとうございます。間もなく開式でございます。本日のお通夜の流れについて、ご案内申し上げます。",
      "この後、導師がご入場いたします。導師の入退場の際は、皆様ご着席のまま、合掌をもってお迎え、お見送りをお願い申し上げます。",
      "ご焼香は、係の者が順にご案内いたします。はじめにご遺族・ご親族の皆様、続いてご弔問の皆様の順にお進みくださいませ。",
      ctx.length !== "short" &&
        "ご焼香の際は、お手荷物をお持ちになったまま焼香台の前へお進みいただけますと、スムーズにご案内できます。",
      "恐れ入りますが、お手元の携帯電話は、電源をお切りいただくか、マナーモードへの切り替えをお願い申し上げます。",
      "開式まで、今しばらくお待ちくださいませ。",
    ),
    note: "会場が静まり、参列者が着席したタイミングで読み上げる。ゆっくりと。",
  };
}

/** 仏式 葬儀・告別式の前説 */
export function preAnnouncementBuddhistFuneral(
  form: FuneralScriptFormData,
): SectionDraft {
  return {
    title: "告別式 開式前 前説",
    kind: "pre_announcement",
    body: lines(
      "皆様にご案内申し上げます。間もなく開式でございます。本日のご葬儀・告別式の流れについて、ご説明申し上げます。",
      "この後、導師がご入場いたします。導師の入退場の際は、皆様ご着席のまま、合掌をもってお迎え、お見送りをお願い申し上げます。",
      form.hasMemorialService &&
        "本日は、ご葬儀に引き続きまして、繰り上げ初七日のお勤めも賜ります。ご遺族・ご親族の皆様には、ご葬儀と初七日で、二度のご焼香をお願い申し上げます。都度、係の者がご案内いたします。",
      "ご焼香は、係の者が順にご案内いたします。ご焼香をお済ませの皆様は、お見送りまでお時間のございます方は、ご自席にてお待ちくださいませ。",
      form.hasFarewellPreparation &&
        "導師ご退席の後、式場内では、故人様との最後のお別れの儀を執り行います。ご準備のため、皆様には一度ご退室いただき、ホールにてお待ちいただきます。あらかじめご了承くださいませ。",
      "恐れ入りますが、お手元の携帯電話は、電源をお切りいただくか、マナーモードへの切り替えをお願い申し上げます。",
      "開式まで、今しばらくお待ちくださいませ。",
    ),
    note: "焼香・お別れの儀・出棺の段取りは、事前に葬儀社・導師と確認しておく。",
  };
}

/** 無宗教 告別式の前説（仏式用語を使わない） */
export function preAnnouncementNonReligious(ctx: ScriptContext): SectionDraft {
  return {
    title: "開式前 前説",
    kind: "pre_announcement",
    body: lines(
      `皆様、本日はお集まりいただき、誠にありがとうございます。間もなく、${ctx.deceasedSama}のお別れの会を開式いたします。本日の流れについて、ご案内申し上げます。`,
      "ご案内は、すべて係の者が順にいたします。式の進行に沿って、皆様にお願い申し上げる場面がございますので、その都度ご案内をお聞きくださいませ。",
      "恐れ入りますが、お手元の携帯電話は、電源をお切りいただくか、マナーモードへの切り替えをお願い申し上げます。",
      "開式まで、今しばらくお待ちくださいませ。",
    ),
    note: "無宗教式は決まった型が少ないため、当日の式次第に合わせて案内内容を調整する。",
  };
}

// ──────────────────────────────────────────────────────────
// 開式の辞
// ──────────────────────────────────────────────────────────

/** 仏式 開式の辞（通夜／葬儀） */
export function openingBuddhist(
  ctx: ScriptContext,
  form: FuneralScriptFormData,
): SectionDraft {
  const isWake = form.ceremonyType === "buddhist_wake";
  const templePart = ctx.officiantName
    ? `お勤めを賜りますご導師は、${ctx.templeName ? `${ctx.templeName} ` : ""}${ctx.officiantName}でございます。`
    : ctx.templeName
      ? `お勤めを賜りますご導師は、${ctx.templeName}でございます。`
      : "";
  const ceremonyWord =
    isWake
      ? "お通夜の儀を執り行います。"
      : form.hasMemorialService
        ? "ご葬儀、並びに初七日のお勤めを執り行います。"
        : "ご葬儀を執り行います。";
  return {
    title: "開式の辞",
    kind: "opening",
    body: lines(`只今より、${ctx.deceasedKo}様の${ceremonyWord}`, templePart),
    note: ctx.officiantName || ctx.templeName
      ? "寺院名・ご導師のお名前は、資料を指差し確認しながらゆっくりと。"
      : "寺院名・導師名が未確認の場合は、当日その箇所を補って読み上げる。",
    avoidPageBreak: true,
  };
}

/** 無宗教 開式の辞 */
export function openingNonReligious(ctx: ScriptContext): SectionDraft {
  return {
    title: "開式の辞",
    kind: "opening",
    body: `只今より、${ctx.deceasedSama}のお別れの会を執り行わせていただきます。`,
    avoidPageBreak: true,
  };
}

// ──────────────────────────────────────────────────────────
// 導師入場 / 退場（仏式のみ）
// ──────────────────────────────────────────────────────────

export function officiantEntrance(): SectionDraft {
  return {
    title: "導師入場",
    kind: "officiant_entrance",
    body: lines(
      "導師、ご入場でございます。ご一同様、合掌をもってお迎えくださいませ。",
      "（ご着座の後）……お直りくださいませ。",
    ),
    note: "入退場時の作法（起立／着座・合掌の有無）は、導師との打ち合わせで確認する。",
    avoidPageBreak: true,
  };
}

export function officiantExit(): SectionDraft {
  return {
    title: "導師退場",
    kind: "officiant_exit",
    body: lines(
      "導師、ご退席でございます。ご一同様、合掌をもってお送りくださいませ。",
      "（ご退席を確認の後）……合掌、お直りくださいませ。",
    ),
    note: "導師が起立後もしばらく作法が続く場合がある。完全に退席態勢になってから案内する。",
    avoidPageBreak: true,
  };
}

// ──────────────────────────────────────────────────────────
// 焼香 / 献花 / 献灯 / 黙祷
// ──────────────────────────────────────────────────────────

export function incense(ctx: ScriptContext): SectionDraft {
  return {
    title: "焼香案内",
    kind: "incense",
    body: lines(
      `これより、ご焼香へとお進みいただきます。${chiefMournerLabel(ctx)}より、お進みくださいませ。`,
      "続いて、ご遺族・ご親族の皆様、ご参列の皆様の順に、係の者がご案内いたします。順次お進みくださいませ。",
    ),
    note: "参列者が多い場合は『お心を込めて一回焼香にて』とご案内し、混雑を避ける。",
    avoidPageBreak: true,
  };
}

export function flowerOffering(ctx: ScriptContext): SectionDraft {
  return {
    title: "献花案内",
    kind: "flower_offering",
    body: lines(
      `これより、皆様それぞれの想いを一輪のお花に託し、ご献花へとお進みいただきます。${chiefMournerLabel(ctx)}より、お進みくださいませ。`,
      "続いて、ご親族の皆様、ご参列の皆様の順に、係の者がご案内いたします。順次お進みくださいませ。",
    ),
    avoidPageBreak: true,
  };
}

export function candleOffering(ctx: ScriptContext): SectionDraft {
  return {
    title: "献灯案内",
    kind: "candle_offering",
    body: lines(
      `これより、皆様の想いを灯りに込めて、ご献灯へとお進みいただきます。${chiefMournerLabel(ctx)}より、お進みくださいませ。`,
      "続いて、ご親族の皆様、ご参列の皆様の順に、係の者がご案内いたします。順次お進みくださいませ。",
    ),
    avoidPageBreak: true,
  };
}

export function silentPrayer(ctx: ScriptContext): SectionDraft {
  return {
    title: "黙祷",
    kind: "silent_prayer",
    body: lines(
      `皆様、それでは、ご一緒に黙祷を捧げ、${ctx.deceasedSama}を偲びたいと存じます。皆様、ご起立をお願いいたします。`,
      "黙祷。",
      "（しばしの後）……黙祷を、お直りくださいませ。ご着席ください。",
    ),
    avoidPageBreak: true,
  };
}

// ──────────────────────────────────────────────────────────
// 弔辞 / 弔電 / 喪主挨拶
// ──────────────────────────────────────────────────────────

export function condolenceAddress(): SectionDraft {
  return {
    title: "弔辞",
    kind: "condolence_address",
    body: lines(
      "これより、弔辞を賜ります。",
      "（ご芳名・お肩書をご紹介のうえ、お一方ずつご登壇いただく）",
      "ご逝去を惜しむ皆様を代表されましての、追悼のお言葉でございました。",
    ),
    note: "弔辞を賜る方のお名前・肩書・順番は、開式前に必ず確認する。",
  };
}

export function telegram(): SectionDraft {
  return {
    title: "弔電紹介",
    kind: "telegram",
    body: lines(
      "本日、多くの皆様より、ご弔電を頂戴しております。これより、謹んでご紹介申し上げます。",
      "（本文を二、三通拝読の後）……以降は、ご尊名のみのご紹介とさせていただきます。",
      "この他にも、多数のご弔電を頂戴しております。謹んでご霊前にお供えさせていただきました。",
    ),
    note: "お名前は読み間違いを防ぐため、必ず振り仮名を確認する。",
  };
}

export function chiefMournerGreeting(ctx: ScriptContext): SectionDraft {
  return {
    title: "喪主挨拶案内",
    kind: "chief_mourner_greeting",
    body: `それではここで、${ctx.chiefMournerName ? `${ctx.chiefMournerName}様` : "喪主様"}より、ご挨拶を申し上げます。`,
    avoidPageBreak: true,
  };
}

// ──────────────────────────────────────────────────────────
// 初七日 / お別れ準備 / 出棺 / 火葬場同行
// ──────────────────────────────────────────────────────────

export function memorialService(): SectionDraft {
  return {
    title: "初七日 繰上げ法要案内",
    kind: "memorial_service",
    body: lines(
      "引き続きまして、繰り上げ初七日の法要を執り行います。",
      "ご遺族・ご親族の皆様には、再度のご焼香をお願い申し上げます。係の者がご案内いたします。",
    ),
    avoidPageBreak: true,
  };
}

export function farewellPreparation(ctx: ScriptContext): SectionDraft {
  return {
    title: "お別れ準備案内",
    kind: "farewell_preparation",
    body: lines(
      `この後、式場内にて、${ctx.deceasedSama}との最後のお別れの儀を執り行います。`,
      "ご準備が整いますまで、皆様には恐れ入りますが、一度ホールへとお移りいただき、お待ちくださいませ。",
      "ご準備が整い次第、改めてご案内申し上げます。",
    ),
    avoidPageBreak: true,
  };
}

export function departure(ctx: ScriptContext): SectionDraft {
  return {
    title: "出棺案内",
    kind: "departure",
    body: lines(
      "皆様にお別れのお花をお納めいただき、これよりご出棺でございます。",
      `${ctx.deceasedSama}が繋いでこられたご縁を皆様に託し、お見送りをいただきます。`,
    ),
    avoidPageBreak: true,
  };
}

export function crematoriumGuidance(ctx: ScriptContext): SectionDraft {
  return {
    title: "火葬場同行案内",
    kind: "crematorium_guidance",
    body: lines(
      ctx.venueName
        ? `ご出棺の後、${ctx.deceasedSama}は ${ctx.venueName} にて荼毘に付されます。`
        : `ご出棺の後、${ctx.deceasedSama}は火葬場にて荼毘に付されます。`,
      "火葬場へご同行いただきます皆様は、お手回り品をお持ちのうえ、お車へとお進みくださいませ。",
    ),
    note: "出棺後に式場へ戻らない場合は、手荷物を持って移動いただくよう必ず案内する。",
    avoidPageBreak: true,
  };
}

// ──────────────────────────────────────────────────────────
// 閉式（宣言文）
// ──────────────────────────────────────────────────────────

/**
 * 閉式の宣言文（式種別ごと）。
 * 「閉式前ナレーション・閉式」統合セクションの末尾に置く固定文の下敷きとして使う。
 * 通夜は「終了」ではなく「区切り」と表現する。
 */
export function closingDeclaration(
  ctx: ScriptContext,
  ceremonyType: FuneralScriptCeremonyType,
): string {
  if (ceremonyType === "non_religious_funeral") {
    return lines(
      "皆様、今一度、正面のご遺影へとお向き直りくださいませ。",
      `${ctx.deceasedSama}が繋いでくださったご縁、遺してくださった数多の思い出は、いつまでも皆様の心に生き続けてまいります。`,
      `以上をもちまして、${ctx.deceasedSama}のお別れの会を、閉会とさせていただきます。本日は、${closingTail(ctx)}`,
    );
  }
  if (ceremonyType === "buddhist_wake") {
    return lines(
      "皆様、今一度、祭壇のご遺影へとお向き直りくださいませ。",
      `以上をもちまして、${ctx.deceasedKo}様の通夜の儀は、ひとまず区切りとさせていただきます。`,
      ctx.startTime
        ? `なお、明日のご葬儀は、${ctx.startTime}より開式の予定でございます。`
        : "なお、明日のご葬儀の開式時刻は、改めてご案内申し上げます。",
      `本日は、長時間にわたり、${closingTail(ctx)}`,
    );
  }
  // 仏式 葬儀・告別式
  return lines(
    "皆様、今一度、祭壇のご遺影へとお向き直りくださいませ。",
    `以上をもちまして、${ctx.deceasedKo}様のご葬儀・告別式を、閉式とさせていただきます。`,
    `本日は、${closingTail(ctx)}`,
  );
}

// ──────────────────────────────────────────────────────────
// AI生成対象（ナレーション）のプレースホルダー
// ──────────────────────────────────────────────────────────

export const AI_PLACEHOLDER_NOTICE =
  "※ この部分はAIナレーション生成の対象です。上の「AIナレーションを生成」で作成できます（手動編集も可）。\n故人様の略歴・お人柄・ご家族との思い出・遺影写真などをもとに、司会用ナレーションを作成します。";

/** 入力済みの情報から簡単な仮文を組み立てる（無ければ null） */
function buildProvisionalNarration(
  ctx: ScriptContext,
  form: FuneralScriptFormData,
  phase: "opening" | "main" | "closing",
): string | null {
  const s: string[] = [];
  const bp = form.birthPlace?.trim();
  const work = form.workDescription?.trim() || form.career?.trim();
  const hobbies = form.hobbies?.trim();
  const personality = form.personality?.trim();
  const portrait = form.portraitPhotoDescription?.trim();
  const episodes = form.episodes?.trim();

  if (phase === "opening" || phase === "main") {
    if (bp || work) {
      s.push(
        `${ctx.deceasedSama}は、${bp ? `${bp}にお生まれになり、` : ""}${work ? `${work}に励まれました。` : "歩みを重ねてこられました。"}`,
      );
    }
    if (hobbies) {
      s.push(`ご趣味は${hobbies}で、心豊かな時間を大切にしてこられました。`);
    }
    if (personality) {
      s.push(`${personality}、ご家族や周りの方々に慕われたお人柄でいらっしゃいました。`);
    }
    if (phase === "main" && episodes) {
      s.push(episodes);
    }
  }

  if (phase === "closing") {
    if (portrait) {
      s.push(`祭壇のご遺影は、${portrait}のお写真でございます。`);
    }
    s.push(
      `共に過ごされた日々を、皆様それぞれに思い起こしていただきながら、${ctx.deceasedSama}を心よりお見送りいただければと存じます。`,
    );
  }

  if (s.length === 0) return null;
  return `（仮文）${s.join("")}`;
}

// 注: byLength 等の長さ調整は length 設定に応じて各テンプレート内で行う（前説の任意一文など）。

/**
 * ナレーション系セクション（AI生成予定）。
 * 入力済み情報があれば仮文を添える。kind は "ai_placeholder"。
 */
export function aiNarration(
  ctx: ScriptContext,
  form: FuneralScriptFormData,
  variant: { title: string; phase: "opening" | "main" | "closing" },
): SectionDraft {
  const provisional = buildProvisionalNarration(ctx, form, variant.phase);
  return {
    title: variant.title,
    kind: "ai_placeholder",
    body: provisional ? `${AI_PLACEHOLDER_NOTICE}\n\n${provisional}` : AI_PLACEHOLDER_NOTICE,
    // aiGenerated はAI生成“後”に true を付ける（プレースホルダー段階では未設定）。
    editable: true,
    note: "AIナレーション生成、または手動編集で本文を差し替えてください。",
  };
}

/**
 * 「閉式前ナレーション・閉式」統合セクション（AI生成対象）。
 * 故人を偲ぶ短い結び（AI生成・仮文）のあとに、固定の閉式宣言文を下敷きとして添える。
 * 進行（お別れ準備・出棺など）はこのセクションには含めない。
 */
export function closingNarrationMerged(
  ctx: ScriptContext,
  form: FuneralScriptFormData,
): SectionDraft {
  const provisional = buildProvisionalNarration(ctx, form, "closing");
  const declaration = closingDeclaration(ctx, form.ceremonyType);
  const provisionalBlock = provisional ? `${provisional}\n\n` : "";
  return {
    title: "閉式前ナレーション・閉式",
    kind: "ai_placeholder",
    body: `${AI_PLACEHOLDER_NOTICE}\n\n${provisionalBlock}${declaration}`,
    editable: true,
    note: "閉式前ナレーションと閉式の辞を兼ねるセクション。結びの言葉のあと、閉式の宣言で締めます（固定文を下敷きにAI生成・手動編集が可能）。",
  };
}
