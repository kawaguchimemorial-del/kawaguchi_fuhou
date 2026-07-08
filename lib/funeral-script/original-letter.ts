import type {
  FuneralScriptFormData,
  FuneralScriptOriginalLetter,
} from "./types";
import {
  ORIGINAL_LETTER_SKILL_VERSION,
  originalLetterTitlePatterns,
} from "./original-letter-skill";

export const ORIGINAL_LETTER_ID = "original-condolence-letter" as const;

const DEFAULT_TITLE = "オリジナル会葬礼状";

const LETTER_NG_WORDS = [
  "ますます",
  "重ね重ね",
  "たびたび",
  "再び",
  "わざわざ",
  "たまたま",
  "また",
  "なお",
  "くれぐれも",
  "死亡",
  "死ぬ",
  "亡くなる",
  "去る",
  "終える",
  "消える",
  "浮かばれない",
  "迷う",
  "涙",
  "忙しい",
] as const;

function text(value?: string): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function cleanForLetter(value?: string): string {
  return text(value)
    .replace(/[、。，．,.]/g, " ")
    .replace(/[「」『』]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function displayName(form: FuneralScriptFormData): string {
  return text(form.deceasedName) || "故人様";
}

function letterSubject(form: FuneralScriptFormData): string {
  const name = text(form.deceasedName);
  if (!name) return "故人様";
  const relation = text(form.letterDeceasedRelationLabel) || "故";
  return `${relation} ${name} 儀`;
}

function shortText(value: string, max = 24): string {
  const cleaned = cleanForLetter(value);
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max);
}

function buildLetterTitle(form: FuneralScriptFormData): string {
  const title = shortText(form.letterTitle ?? "", 28);
  if (title) return title;

  const words = shortText(form.letterMemorableWords ?? "", 18);
  if (words) return `${words} その言葉を大切に`;

  const mainMessage = shortText(form.letterMainMessage ?? "", 18);
  if (mainMessage) return `${mainMessage} 感謝を込めて`;

  const personality = shortText(form.personality ?? "", 16);
  if (personality) return `${personality}ぬくもりに支えられて`;

  const hobbies = shortText(form.hobbies ?? "", 12);
  if (hobbies) return `${hobbies}を愛した日々`;

  return originalLetterTitlePatterns[0].replace("を伝える短い見出し", "を込めて");
}

function sentenceLines(lines: string[]): string {
  return lines
    .map((line) => normalizeOriginalLetterBody(line))
    .filter(Boolean)
    .join("\n");
}

function buildStoryLines(form: FuneralScriptFormData): string[] {
  const name = displayName(form);
  const lines: string[] = [];
  const work = cleanForLetter(form.workDescription || form.career);
  const hobbies = cleanForLetter(form.hobbies);
  const personality = cleanForLetter(form.personality);
  const episodes = cleanForLetter(form.episodes);
  const family = cleanForLetter(form.familyStructure);
  const portrait = cleanForLetter(form.portraitPhotoDescription);
  const community = cleanForLetter(form.communityActivities);
  const achievements = cleanForLetter(form.achievements);
  const mainMessage = cleanForLetter(form.letterMainMessage);
  const memorableWords = cleanForLetter(form.letterMemorableWords);

  if (mainMessage) {
    lines.push(`私たち家族が皆様にお伝えしたいのは ${mainMessage} という思いです`);
  }

  if (memorableWords) {
    lines.push(`${name}が大切にしていた「${memorableWords}」という言葉を思い出すたび 家族は今も励まされています`);
  }

  if (episodes) {
    lines.push(`${episodes} そんな日々の一場面を 家族はこれからも大切にしてまいります`);
  }

  if (personality) {
    lines.push(`${personality}ところがあり 家の中ではその一言や仕草に何度も助けられてきました`);
  }

  if (hobbies) {
    lines.push(`${hobbies}に向かう時間は 本人らしさがよく表れるひとときで 家族にとっても忘れがたい記憶です`);
  }

  if (work || community || achievements) {
    const parts: string[] = [];
    if (work) parts.push(`${work}に励み`);
    if (community) parts.push(`${community}に心を寄せ`);
    if (achievements) parts.push(`${achievements}を大切にし`);
    lines.push(`${parts.join(" ")} その背中から 家族は人に誠実であることを教わりました`);
  }

  if (family) {
    lines.push(`${family}に囲まれて過ごした時間の中に 家族だけが知るやさしさがたくさん残っています`);
  }

  if (portrait) {
    lines.push(`遺影に選んだ写真は ${portrait}の一枚です 家族の好きな表情を皆様にも見ていただきたく選びました`);
  }

  return lines.slice(0, 6);
}

export function normalizeOriginalLetterBody(input: string): string {
  return input
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/[、。，．,.]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildOriginalCondolenceLetter(
  form: FuneralScriptFormData,
): FuneralScriptOriginalLetter {
  const subject = letterSubject(form);
  const title = buildLetterTitle(form);
  const storyLines = buildStoryLines(form);
  const body = sentenceLines([
    title,
    `本日は ${subject} 葬儀に際し ご会葬くださいまして 心より御礼申し上げます`,
    ...storyLines,
    "皆様からお寄せいただいたお言葉に 私たち家族は支えられております",
    "生前に賜りましたご厚情に 深く感謝申し上げるとともに いただいたご縁をこれからも大切にしてまいります",
    "本来であれば拝眉のうえ御礼申し上げるべきところ 略儀ながら書中をもちまして御礼申し上げます",
  ]);

  return {
    id: ORIGINAL_LETTER_ID,
    title: DEFAULT_TITLE,
    body,
    aiGenerated: false,
    updatedAt: new Date().toISOString(),
  };
}

export function originalLetterCharCount(body: string): number {
  return normalizeOriginalLetterBody(body).replace(/\s/g, "").length;
}

export function buildOriginalLetterFooter(
  form: FuneralScriptFormData,
): string {
  const date = text(form.letterDate) || "令和　年　月　日";
  const address = text(form.letterSenderAddress) || "住所　";
  const mourner = text(form.letterSenderName || form.chiefMournerName);
  return [
    date,
    address,
    `喪主　${mourner || "　　　　　"}`,
    "外　親族一同",
  ].join("\n");
}

export function buildOriginalLetterPrintSpec(
  form: FuneralScriptFormData,
  letter: FuneralScriptOriginalLetter,
): string {
  const count = originalLetterCharCount(letter.body);
  const instructions = text(form.letterPrintInstructions);
  return [
    "用途：オリジナル会葬礼状",
    "組版：縦書き想定　句読点なし",
    `制作ガイド：${ORIGINAL_LETTER_SKILL_VERSION}`,
    `本文文字数：${count}字`,
    "本文目安：見出し込み450〜760字",
    "校正：喪主・ご家族確認後に入稿",
    instructions ? `印刷会社への申し送り：${instructions}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function originalLetterToPrintText(
  form: FuneralScriptFormData,
  letter: FuneralScriptOriginalLetter,
): string {
  return [
    "【印刷会社提出用】",
    `【${letter.title}】`,
    "",
    "【仕様】",
    buildOriginalLetterPrintSpec(form, letter),
    "",
    "【本文】",
    normalizeOriginalLetterBody(letter.body),
    "",
    "【差出人】",
    buildOriginalLetterFooter(form),
  ].join("\n");
}

export function detectOriginalLetterWarnings(body: string): string[] {
  const normalized = normalizeOriginalLetterBody(body);
  const warnings: string[] = [];
  const found = LETTER_NG_WORDS.filter((word) => normalized.includes(word));
  if (found.length > 0) {
    warnings.push(`会葬礼状の忌み言葉候補をご確認ください: ${found.join("、")}`);
  }
  if (/[、。，．,.]/.test(body)) {
    warnings.push("句読点が含まれています。印刷時は空白または改行への調整を推奨します。");
  }
  if (/ご家族より|伺いました|伺っております|だそう/.test(normalized)) {
    warnings.push("司会者目線の表現が含まれています。礼状本文は喪主・親族側の声に直してください。");
  }
  if (/面影を偲|歩んでまいりました|在りし日のお姿|見守っているよう/.test(normalized)) {
    warnings.push("葬儀ナレーション調の表現が含まれています。会葬礼状として家族の手紙調に直してください。");
  }
  const count = originalLetterCharCount(body);
  if (count < 360) {
    warnings.push("本文が短めです。オリジナル礼状としては故人らしい一場面や家族の感謝を足せるか確認してください。");
  }
  if (count > 820) {
    warnings.push("本文が長めです。カード紙面に収まるか印刷会社へ確認してください。");
  }
  return warnings;
}
