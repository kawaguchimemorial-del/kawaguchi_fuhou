/**
 * OpenAI へ渡すナレーション生成プロンプトの組み立て。
 *
 * 紙面抽出資料（docs/funeral-script/source-extraction/）から整理した文体ルール（style-guide.ts）と
 * 忌み言葉（ng-words.ts）、フォーム入力、生成対象セクションを 1 本のプロンプトに統合する。
 * Markdown 本文そのものは投げず、要約・構造化したルールのみを渡す。
 */

import { CEREMONY_TYPE_LABELS } from "./flows";
import {
  ceremonyRulesFor,
  funeralNarrationStyleGuide as guide,
  lengthStyleInstructions,
  toneStyleInstructions,
} from "./style-guide";
import { NG_WATCH_WORDS } from "./ng-words";
import { buildScriptContext, closingDeclaration } from "./phrases";
import {
  expressionBank,
  extractMonth,
  seasonalExpression,
} from "./expressions";
import type {
  FuneralScriptCeremonyType,
  FuneralScriptFormData,
  FuneralScriptSection,
} from "./types";

/**
 * 「最丁寧（most_detailed）」のときだけ付与する追加素材。
 * - 生・没の月から季節を感じさせる句
 * - ショートフレーズ集由来の参考表現（丸写しせず、合う場合のみ活用）
 * それ以外の length では空配列。
 */
function buildMostDetailedBlock(form: FuneralScriptFormData): string[] {
  if (form.length !== "most_detailed") return [];

  const block: string[] = ["", "# 最丁寧モードの追加指示"];

  const birthSeason = seasonalExpression(extractMonth(form.birthDate));
  const deathSeason = seasonalExpression(extractMonth(form.deathDate));
  if (birthSeason || deathSeason) {
    block.push("- 季節感を一言添える（無理に全部使わず、自然に。創作の事実は加えない）:");
    if (birthSeason) block.push(`  - お生まれの月の情景: ${birthSeason}`);
    if (deathSeason) block.push(`  - 旅立たれた月の情景: ${deathSeason}`);
  } else {
    block.push(
      "- 月が分かる場合は、その季節を感じさせる一言を自然に添える（不明なら無理に書かない）。",
    );
  }

  block.push(
    "- 次の参考表現は“素材”です。故人に合う場合のみ、言い回しを整えて自然に取り入れる（丸写し・羅列はしない／合わなければ使わない）:",
    `  - 遺影への言及: ${expressionBank.portraitIntros.join(" / ")}`,
    `  - 人柄: ${expressionBank.personalityExpressions.join(" / ")}`,
    `  - 歩み・仕事: ${expressionBank.profileExpressions.join(" / ")}`,
    `  - 家族への想い: ${expressionBank.familyExpressions.join(" / ")}`,
    `  - 結びの余韻: ${expressionBank.closingExpressions.join(" / ")}`,
    "- 情報のある項目を、歩み→人柄→趣味/活動→家族→遺影→結び の流れで丁寧につなぐ。入力に無い事実は決して作らない。",
  );

  return block;
}

/** セクションIDの接頭辞から式種別を判定（通夜・告別式の統合台本で日ごとに使い分けるため） */
function ceremonyTypeFromSectionId(
  id: string,
  fallback: FuneralScriptCeremonyType,
): FuneralScriptCeremonyType {
  const known: FuneralScriptCeremonyType[] = [
    "buddhist_wake_funeral",
    "buddhist_wake",
    "buddhist_funeral",
    "non_religious_funeral",
  ];
  // より長い接頭辞を優先（buddhist_wake_funeral を buddhist_wake より先に判定）
  for (const t of known) {
    if (id.startsWith(`${t}-`)) return t;
  }
  return fallback;
}

/** 会葬者の様子 → AI へ渡す状況説明 */
const WAKE_ATTENDANCE_PHRASES: Record<string, string> = {
  many: "通夜には大勢の会葬者がお運びになった",
  more_than_expected: "通夜には予想を上回る多くの会葬者がお運びになった",
  family_centered: "通夜はご親族・親しい方々を中心に営まれた",
  heartfelt_small: "通夜は少人数ながら心のこもった見送りとなった",
};

/**
 * 告別式の「偲ぶ」開式ナレーションかどうか（通夜への言及を載せる対象）。
 * - 仏式 告別式/一日葬: 「開式ナレーション」
 * - 無宗教 告別式: 「メインナレーション」
 * - 通夜（buddhist_wake）当日のナレーションは対象外（前日の通夜にはまだ言及できない）。
 */
function isFuneralDayOpening(
  section: FuneralScriptSection,
  fallback: FuneralScriptCeremonyType,
): boolean {
  const sub = ceremonyTypeFromSectionId(section.id, fallback);
  if (sub === "buddhist_wake") return false;
  return section.title.includes("開式") || section.title.includes("メイン");
}

/** 開式ナレーションかどうか（通夜・告別式とも対象） */
function isOpeningNarration(section: FuneralScriptSection): boolean {
  return section.title.includes("開式") || section.title.includes("メイン");
}

/**
 * その日（通夜／告別式）ならではのナレーションの力点。
 * 通夜・告別式を同じ調子で書かせず、役割を変えて単調な繰り返しを防ぐ。
 */
function openingDayEmphasis(sub: FuneralScriptCeremonyType): string[] {
  if (sub === "buddhist_wake") {
    return [
      "  この通夜ならではの力点: 突然のお別れに、急ぎ駆けつけてくださった弔問への謝意を起点にする。故人を偲ぶ「はじまり」の導入として、生前の人柄に静かに触れ、明日の告別式へつなぐ含みを残す。語り出しは落ち着いた調子で。",
    ];
  }
  return [
    "  この告別式ならではの力点: いよいよ最後のお別れ・ご出立という節目。通夜での導入を受けて一歩進め、故人の歩みや遺された方々への想いを深め、結び（旅立ち・見送り）へ向けて展開する。通夜と同じ言い回し・同じ事実の単なる繰り返しは避ける。",
  ];
}

/** 通夜引き継ぎ素材があれば、告別式開式ナレーションへ織り込む指示行を作る */
function wakeReferenceLines(form: FuneralScriptFormData): string[] {
  const attendance = form.wakeAttendance
    ? WAKE_ATTENDANCE_PHRASES[form.wakeAttendance]
    : undefined;
  const impression = form.wakeImpression?.trim();
  if (!attendance && !impression) return [];

  const facts: string[] = [];
  if (attendance) facts.push(attendance);
  if (impression) facts.push(`通夜で印象的だったこと: ${impression}`);

  return [
    "  前日の通夜の様子（この告別式の冒頭付近で自然に触れる）:",
    ...facts.map((f) => `    - ${f}`),
    "  指示: 上記の通夜の事実を、単に述べるのではなく、故人の歩み・人柄に結びつけて意味づけする一文を冒頭付近に自然に織り込む（例:「昨夜の通夜には多くの方にお運びいただきました。これもひとえに、〇〇様が歩んでこられた〜の証でございましょう」）。大げさにせず一文程度に留め、書かれていない事実は創作しない。",
  ];
}

/** セクションの役割ガイド（タイトルから推定） */
function sectionRoleGuide(section: FuneralScriptSection): {
  kindLabel: string;
  structure: string[];
} {
  const t = section.title;
  if (t.includes("メイン")) {
    return {
      kindLabel: "メインナレーション（芯の一挿話）",
      structure: [
        "役割: この方が“どういう人だったか”を、一つの挿話を軸に立ち上げる。経歴の紹介ではない。",
        ...guide.mainNarrationStructure,
      ],
    };
  }
  if (t.includes("閉式")) {
    return {
      kindLabel: "閉式前ナレーション・閉式（閉式の辞を含む）",
      structure: [
        "役割: 故人本人の紹介を繰り返さず、遺された家族がこれから何を受け取って生きていくか、へ静かに視点を移す。",
        ...guide.closingNarrationStructure,
        "結びのナレーションのあと、最後は必ず閉式の宣言で締める（下記の閉式の言葉を下敷きにする）",
      ],
    };
  }
  if (t.includes("開式")) {
    return {
      kindLabel: "開式ナレーション（人物像の導入）",
      structure: [
        "役割: この方が“どういう人だったか”が一場面で伝わる導入にする。経歴紹介にはしない。",
        ...guide.openingNarrationStructure,
      ],
    };
  }
  // 将来の細分セクション（遺影写真紹介・人柄紹介 等）への汎用フォールバック
  return {
    kindLabel: t,
    structure: [
      "入力された故人情報の範囲で、該当テーマを簡潔に紹介する",
      "進行案内は含めず、故人を偲ぶ読み上げ文にする",
    ],
  };
}

/** 入力済みの故人情報だけを箇条書きにする（空欄は出さない） */
function deceasedInfoLines(form: FuneralScriptFormData): string[] {
  const pairs: [string, string | undefined][] = [
    ["故人名", form.deceasedName],
    ["生年月日", form.birthDate],
    ["没日", form.deathDate],
    ["行年", form.age],
    ["出身地", form.birthPlace],
    ["趣味", form.hobbies],
    ["遺影写真（いつ・何の写真か）", form.portraitPhotoDescription],
    ["学歴", form.education],
    ["職歴", form.career],
    ["仕事内容", form.workDescription],
    ["地域での活動", form.communityActivities],
    ["生前の功労", form.achievements],
    ["家族構成", form.familyStructure],
    ["エピソード", form.episodes],
    ["人柄", form.personality],
  ];
  return pairs
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- ${k}: ${v!.trim()}`);
}

export function buildFuneralNarrationPrompt(params: {
  form: FuneralScriptFormData;
  targetSections: FuneralScriptSection[];
}): string {
  const { form, targetSections } = params;
  const ceremonyLabel = CEREMONY_TYPE_LABELS[form.ceremonyType];
  const isNonReligious = form.ceremonyType === "non_religious_funeral";
  const nameForGuide = form.deceasedName.trim()
    ? `${form.deceasedName.trim()}様`
    : "故人様";

  const infoLines = deceasedInfoLines(form);
  const hasInfo = infoLines.length > 0;

  const ctx = buildScriptContext(form);

  const targetBlocks = targetSections.map((s) => {
    const role = sectionRoleGuide(s);
    const lines = [
      `- id: "${s.id}"`,
      `  種類: ${role.kindLabel}`,
      `  構成の目安: ${role.structure.join(" / ")}`,
    ];
    if (s.title.includes("閉式")) {
      // 統合「閉式前ナレーション・閉式」の締め。通夜・告別式（統合）では
      // セクションIDの接頭辞から日ごとの式種別を判定し、通夜は「区切り」表現を保つ。
      const sub = ceremonyTypeFromSectionId(s.id, form.ceremonyType);
      const closingLine = closingDeclaration(ctx, sub).replace(/\n/g, " ");
      lines.push(`  閉式の言葉（この趣旨で必ず締める。言い回しは整えてよい）: ${closingLine}`);
    }
    if (isOpeningNarration(s)) {
      const sub = ceremonyTypeFromSectionId(s.id, form.ceremonyType);
      lines.push(...openingDayEmphasis(sub));
    }
    if (isFuneralDayOpening(s, form.ceremonyType)) {
      lines.push(...wakeReferenceLines(form));
    }
    return lines.join("\n");
  });

  // 通夜と告別式の開式ナレーションが両方ある（統合台本）か
  const openingDays = new Set(
    targetSections
      .filter(isOpeningNarration)
      .map((s) => ceremonyTypeFromSectionId(s.id, form.ceremonyType)),
  );
  const hasBothDays =
    openingDays.has("buddhist_wake") &&
    (openingDays.has("buddhist_funeral") ||
      openingDays.has("buddhist_wake_funeral"));

  const rules = [
    ...guide.commonToneRules,
    ...ceremonyRulesFor(form.ceremonyType),
    ...guide.separationRules,
    ...guide.profileFlow,
    ...guide.portraitMentionTips,
  ];

  rules.push(
    "『かけがえのない』『安らかに』などの結び言葉は、使ってよいが同一台本内で反復しない。閉式前と結びで同じ着地語を繰り返さない。",
  );

  if (hasBothDays) {
    rules.push(
      "通夜と告別式のナレーションは、同じ素材を扱っても内容・構成・言い回しを必ず変える。通夜は『お別れのはじまり・弔問への謝意』、告別式は『最後のお別れ・出立への展開と結び』と役割を分け、同じ文章の使い回しや同一エピソードの単純な再掲はしない。告別式は通夜を受けて一歩深める。",
    );
  }

  // 「最丁寧」モードの追加素材（季節感・参考表現）
  const mostDetailedBlock = buildMostDetailedBlock(form);

  return [
    "あなたは、日本の葬儀における司会者向けの台本ナレーションを作成する専門家です。",
    "現場の司会資料から整理された文体ルール・構成ルール・表現傾向に厳密に従ってください。",
    "",
    "# 式の情報",
    `- 式種別: ${ceremonyLabel}`,
    isNonReligious
      ? "- 宗教区分: 無宗教式（仏式・宗教用語は使わない）"
      : "- 宗教区分: 仏式",
    `- 故人の呼称: ${nameForGuide}（過度に連発しない）`,
    "",
    "# 文体設定",
    `- 文体（tone）: ${toneStyleInstructions[form.tone]}`,
    `- 長さ（length）: ${lengthStyleInstructions[form.length]}`,
    "",
    "# 生成前の内部整理（本文には出力しない）",
    "- まず素材から『この人を一言で言えば何か』という中心像を一つ内部で決める。",
    "- 中心像は本文に見出しやラベルとして書かず、全セクションの底に一貫して流す。",
    "- 与えられた故人情報は“紹介する項目”ではなく“情景を描くための素材”として扱う。箇条書きの順番どおりに並べず、芯の一挿話に他を従わせる。",
    "",
    "# 生成対象セクション（この id 以外は作らない／進行案内は作らない）",
    ...targetBlocks,
    "",
    "# 分量の目安（字数ノルマは課さない）",
    "- 開式ナレーション: 3〜5文程度。メインナレーション: 素材が十分なら6〜10文、薄ければ短く。閉式前: 3〜4文程度。",
    "- 一文は司会者が読み上げやすい長さに区切り、改行（\\n）で息継ぎを入れる。",
    "",
    "# 故人情報（この内容だけを使う。書かれていない事実・逸話・続柄・年号を創作しない）",
    hasInfo
      ? infoLines.join("\n")
      : "- （ほとんど入力がありません。無理に補わず、短く自然なナレーションにまとめてください）",
    "",
    "# 文体・構成ルール（必ず守る）",
    ...rules.map((r) => `- ${r}`),
    ...mostDetailedBlock,
    "",
    "# 避ける表現（忌み言葉・重ね言葉・直接表現）",
    `- 次の語は避ける: ${NG_WATCH_WORDS.join("、")}`,
    "- 「死亡」「死ぬ」などは「ご逝去」「旅立ち」などへ言い換える",
    "- 文末に「〜だそうです」を用いるのは可（司会者は第三者の立場のため）",
    "",
    "# 出力形式（厳守）",
    "- 必ず次の JSON オブジェクトのみを出力する（前後に説明文やコードフェンスを付けない）。",
    '- 形式: {"sections":[{"id":"<対象id>","body":"<本文>"}]}',
    "- body は読み上げ用の本文。適度な改行（\\n）を含めてよい。",
    "- 対象セクションの id すべてに対して body を返す。対象外の id は含めない。",
  ].join("\n");
}
