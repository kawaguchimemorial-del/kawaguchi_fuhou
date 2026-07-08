/**
 * 「最丁寧」ナレーション向けの表現リソース。
 *
 * 出典: docs/funeral-script/source-extraction/extracted-all.md の
 *  - 12か月の季節フレーズ（No.021–023）
 *  - テーマ別ショートナレーション／フレーズ集（No.001–038 ほか）
 * を、丸写しせず汎用化・要約した「参考表現」。AIには“素材”として渡し、
 * 故人情報に合う場合のみ自然に取り入れさせる（合わない場合は使わない）。
 */

/** 月（1–12）→ 季節を感じさせる短い句（汎用化） */
const SEASONAL_BY_MONTH: Record<number, string> = {
  1: "寒さ厳しく、澄みわたる冬空の頃",
  2: "春の兆しがかすかに感じられる、立春の頃",
  3: "草木が芽吹きはじめる、早春の頃",
  4: "桜花が咲き誇る、うららかな春の日",
  5: "新緑がまぶしく、風薫る頃",
  6: "紫陽花が雨に色を添える、梅雨の頃",
  7: "夏空が広がり、蝉しぐれの響く頃",
  8: "入道雲がわき立つ、盛夏の頃",
  9: "朝夕に秋の気配が漂いはじめる頃",
  10: "木々が色づき、秋の深まる頃",
  11: "落ち葉が舞い、晩秋の趣が深まる頃",
  12: "木枯らしが吹き、年の瀬を迎える師走の頃",
};

/** 自由記入の日付文字列から月（1–12）を取り出す。取れなければ null。 */
export function extractMonth(dateStr?: string): number | null {
  if (!dateStr) return null;
  // 全角数字を半角へ
  const normalized = dateStr.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );
  const m = normalized.match(/(\d{1,2})\s*月/);
  if (!m) return null;
  const month = Number(m[1]);
  return month >= 1 && month <= 12 ? month : null;
}

/** 月の季節句を返す（無ければ null）。 */
export function seasonalExpression(month: number | null): string | null {
  if (month === null) return null;
  return SEASONAL_BY_MONTH[month] ?? null;
}

/**
 * 最丁寧で活用する参考表現バンク（汎用・短句）。
 * いずれも「丸写しせず、故人に合う場合のみ自然に取り入れる」前提。
 */
export const expressionBank = {
  /** 遺影写真への自然な言及 */
  portraitIntros: [
    "皆様を見守るように、穏やかに微笑むご遺影",
    "あのお写真は、〜で撮影された一枚",
    "花々に囲まれて皆様を見守るお姿",
  ],
  /** 結び・余韻の比喩表現 */
  closingExpressions: [
    "掛け替えのない思い出は、いつまでも色褪せず心のアルバムに綴られていく",
    "面影は、いつまでも皆様の心の中に生き続けていく",
    "一瞬の輝きと、永遠に残る思い出",
  ],
  /** 人柄を表す短句 */
  personalityExpressions: [
    "陽だまりのように温かい、人間味あふれるお人柄",
    "人を惹きつけてやまない魅力をお持ちのお方",
    "誰よりも面倒見がよく、優しいお人柄",
    "温厚で慎み深く、周りの人をも優しくする深い優しさ",
  ],
  /** 歩み・仕事への打ち込みを表す短句 */
  profileExpressions: [
    "骨身を惜しまず、一意専心、励まれた歩み",
    "数多の出会いを絆に変えて歩んでこられたご生涯",
    "時代の荒波を強く生き抜いてこられたご生涯",
  ],
  /** 家族への想いを表す短句 */
  familyExpressions: [
    "ご家族の笑顔を道標に歩んでこられた",
    "無償の愛で、ご家族を包んでくださった",
    "掛け替えのない日々を、ご家族と紡いでこられた",
  ],
} as const;
