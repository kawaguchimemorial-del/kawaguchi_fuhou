import { toneStyleInstructions } from "./style-guide";
import { ORIGINAL_LETTER_ID } from "./original-letter";
import { buildOriginalLetterSkillPrompt } from "./original-letter-skill";
import type {
  FuneralScriptFormData,
  FuneralScriptOriginalLetter,
} from "./types";

function line(label: string, value?: string): string | null {
  const text = value?.trim();
  return text ? `- ${label}: ${text}` : null;
}

function formLines(form: FuneralScriptFormData): string[] {
  return [
    line("故人名", form.deceasedName),
    line("生年月日", form.birthDate),
    line("没日", form.deathDate),
    line("行年", form.age),
    line("出身地", form.birthPlace),
    line("趣味", form.hobbies),
    line("遺影写真", form.portraitPhotoDescription),
    line("学歴", form.education),
    line("職歴", form.career),
    line("仕事内容", form.workDescription),
    line("地域での活動", form.communityActivities),
    line("生前の功労", form.achievements),
    line("家族構成", form.familyStructure),
    line("エピソード", form.episodes),
    line("人柄", form.personality),
    line("喪主名", form.letterSenderName || form.chiefMournerName),
    line("礼状の続柄表記", form.letterDeceasedRelationLabel),
    line("礼状の見出し・タイトル案", form.letterTitle),
    line("必ず伝えたいこと", form.letterMainMessage),
    line("口癖・好きだった言葉", form.letterMemorableWords),
    line("礼状日付", form.letterDate),
    line("差出人住所", form.letterSenderAddress),
    line("喪主・家族からの修正指示", form.letterFamilyInstructions),
    line("印刷会社への申し送り", form.letterPrintInstructions),
  ].filter(Boolean) as string[];
}

export const ORIGINAL_LETTER_SYSTEM_INSTRUCTIONS =
  "あなたは日本の葬儀で用いるオリジナル会葬礼状の原稿を作成する専門家です。司会ナレーションではなく、会葬者が持ち帰って読む喪主・親族からの礼状本文を作ります。出力は指定のJSONオブジェクトのみとします。";

export function buildOriginalLetterPrompt(params: {
  form: FuneralScriptFormData;
  currentLetter?: FuneralScriptOriginalLetter | null;
}): string {
  const { form, currentLetter } = params;
  const info = formLines(form);
  const current = currentLetter?.body?.trim();
  const relation = form.letterDeceasedRelationLabel?.trim() || "故";
  const subject = form.deceasedName?.trim()
    ? `${relation} ${form.deceasedName.trim()} 儀`
    : "故人様";

  return [
    "会葬者へ渡す「オリジナル会葬礼状」の本文だけを作成してください。",
    "本文はアプリ側で差出人・日付・住所と組み合わせて印刷会社へ渡します。本文内に日付・住所・喪主名・親族一同は入れないでください。",
    "",
    buildOriginalLetterSkillPrompt(),
    "",
    "# 入力情報",
    info.length > 0 ? info.join("\n") : "- 入力情報は少なめです",
    "",
    "# 現在の本文",
    current
      ? current
      : "（初回生成です。入力情報から自然な初稿を作成してください）",
    current
      ? "※現在の本文が司会ナレーション調・経歴紹介調の場合は引きずらず、入力情報と修正指示を優先して全面的に書き直してください。"
      : "",
    "",
    "# 文体",
    `- ${toneStyleInstructions[form.tone]}`,
    "- 司会者が読み上げる紹介文ではなく、会葬者が持ち帰って読む家族からの手紙として書く",
    "- 形式的な礼状に終わらせず、入力にある範囲で故人らしさ・家族の感謝を中心にする",
    "- 司会者目線ではなく、喪主・親族側からの礼状として書く",
    "- 『ご家族より伺いました』『だそうです』『在りし日のお姿』などの第三者表現・ナレーション表現は使わない",
    "",
    "# 会葬礼状の構成",
    "- 1行目: 見出し。入力に見出し案があれば優先し、なければ取材素材から短く作る",
    `- 2行目: 「本日は ${subject} 葬儀に際し」など、会葬・弔意への御礼を短く述べる`,
    "- 中盤前半: 家族目線で生活の一場面を書く。故人を外から紹介せず、家族が何を受け取ったかを書く",
    "- 中盤後半: 必ず伝えたいこと、口癖・好きだった言葉、喪主の修正指示を優先して反映する",
    "- 終盤: 会葬者からの言葉に支えられていること、生前の厚情への感謝、書中での御礼で結ぶ",
    "",
    "# 厳守ルール",
    "- 入力にない事実、職業、続柄、場所、病名、年齢、宗教表現を創作しない",
    "- 『ご多忙』は使わず『ご多用』などにする",
    "- 句読点（、。）は使わない。区切りは改行または全角スペースにする",
    "- 時候の挨拶は入れない",
    "- 頭語・結語（拝啓・敬具）は原則入れない。入れる場合は必ず対にするが、この出力では入れない",
    "- 忌み言葉・重ね言葉を避ける（ますます、重ね重ね、たびたび、再び、また、なお、くれぐれも、死亡、死ぬ、去る、終える、消える、迷う、涙、忙しい等）",
    "- 履歴書や略歴のように、生年月日・職歴・趣味を順番に並べない",
    "- 『歩んでまいりました』『面影を偲び』『皆様を見守っているよう』など葬儀ナレーション調の言い回しを避ける",
    "- 目安は見出し込み450〜760字。情報が少ない場合は創作で埋めず、380字程度まで短くしてよい",
    "",
    "# 出力形式（厳守）",
    "- 必ず次の JSON オブジェクトのみを出力する（前後に説明文やコードフェンスを付けない）。",
    `- 形式: {"sections":[{"id":"${ORIGINAL_LETTER_ID}","body":"<本文>"}]}`,
  ].join("\n");
}
