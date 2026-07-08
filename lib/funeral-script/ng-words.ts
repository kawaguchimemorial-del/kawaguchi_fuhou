/**
 * 忌み言葉・避けたい表現の簡易チェック。
 *
 * 方針:
 * - AI生成されたナレーション本文に対してのみ適用する（固定テンプレートには適用しない）。
 * - 機械的な全置換は不自然になりやすいため、明らかに安全な語のみ言い換え、
 *   残りは warnings として「確認してください」と促す。
 */

/** 監視対象の語（含まれていたら warning にする） */
export const NG_WATCH_WORDS: string[] = [
  "ますます",
  "重ね重ね",
  "たびたび",
  "再び",
  "続いて",
  "追って",
  "死ぬ",
  "死亡",
  "生きていた",
  "消える",
  "浮かばれない",
  "迷う",
];

/**
 * 明らかに安全な言い換えのみ自動置換する（文意を壊しにくいもの）。
 * 活用変化する語（「死ぬ」など）は自動置換せず warning に回す。
 */
const SAFE_REPLACEMENTS: { from: string; to: string }[] = [
  { from: "死亡", to: "ご逝去" },
  { from: "生きていた", to: "歩まれた" },
  { from: "再び", to: "あらためて" },
];

/** 言い換えの提案（warning 表示に使う。自動置換しない語も含む） */
export const NG_SUGGESTIONS: Record<string, string> = {
  死亡: "ご逝去",
  死ぬ: "旅立つ／ご逝去",
  生きていた: "お元気でいらした／歩まれた",
  続いて: "それでは（文脈に応じて）",
  再び: "あらためて",
  ますます: "使用を避ける",
  重ね重ね: "使用を避ける",
  たびたび: "使用を避ける",
  追って: "のちほど（文脈に応じて）",
  消える: "使用を避ける",
  浮かばれない: "使用を避ける",
  迷う: "使用を避ける",
};

export type NgCheckResult = {
  /** 安全な言い換えを適用したあとの本文 */
  text: string;
  /** 適用後も残っている監視語 */
  remaining: string[];
};

/** 安全な言い換えを適用し、残った監視語を返す。 */
export function applyNgRewrite(input: string): NgCheckResult {
  let text = input;
  for (const { from, to } of SAFE_REPLACEMENTS) {
    if (text.includes(from)) {
      text = text.split(from).join(to);
    }
  }
  const remaining = NG_WATCH_WORDS.filter((w) => text.includes(w));
  return { text, remaining };
}

/** 監視語のみを検出（置換しない）。 */
export function detectNgWords(input: string): string[] {
  return NG_WATCH_WORDS.filter((w) => input.includes(w));
}
