/**
 * オリジナル会葬礼状の制作スキル。
 *
 * public/images/tmp/orijinarurei/ に保存された実例画像と検索結果断片を確認し、
 * 文章生成へ渡すための「構成・判断基準」だけを抽出したもの。
 * 実例本文は転載せず、汎用化したルールとして保持する。
 */

export const ORIGINAL_LETTER_SKILL_VERSION =
  "orijinarurei-sample-analysis-2026-06-26" as const;

export const originalLetterObservedPatterns = [
  "縦書きカード前提で、本文・差出人・日付が明確に分かれている",
  "冒頭に短い見出し、または故人へ語りかける一行を置く例が多い",
  "単なる経歴紹介ではなく、家族が思い出す一場面から故人らしさを伝えている",
  "会葬者が持ち帰って読む家族からの手紙であり、司会者が読み上げる紹介文ではない",
  "仕事・趣味・地域活動は列挙せず、故人の価値観や人柄が伝わる材料として扱う",
  "写真や背景は補助であり、本文は読後に故人の姿が浮かぶことを優先している",
  "終盤は会葬者と生前の厚情への感謝、略儀ながら書中で礼を述べる形に戻る",
  "文量は短すぎず、二つ折りやカード紙面に収まる程度の密度に整えられている",
] as const;

export const originalLetterExpertReviewLenses = [
  {
    role: "葬儀ディレクター",
    positive: "参列者への礼を冒頭と結びで崩さず、式後に渡しても失礼のない形を保つ",
    caution: "感動を狙いすぎると会葬礼状の品位が落ちるため、定型礼文へ最後は戻す",
  },
  {
    role: "礼状専門ライター",
    positive: "見出しと一場面を置くと、汎用文面ではなく取材由来の礼状に見える",
    caution: "年表のように生年・職歴・趣味を順番に並べるとオリジナル感が弱くなる",
  },
  {
    role: "葬儀司会者",
    positive: "司会ナレーションより静かに、紙面で読まれる余韻を残す文がよい",
    caution: "司会者目線の『伺っております』を礼状本文に入れると家族の声から離れる",
  },
  {
    role: "喪主・家族代理",
    positive: "家族だけが知る癖、口癖、日常の所作を一つ入れると納得感が上がる",
    caution: "事実と違う美談や過度な断定は校正で強い修正対象になる",
  },
  {
    role: "印刷会社組版担当",
    positive: "句読点を使わず、改行と全角空白で区切ると縦書きの入稿に回しやすい",
    caution: "本文が長すぎると二つ折りカードで文字が小さくなり、校正負荷が増える",
  },
  {
    role: "現場UX設計者",
    positive: "喪主の修正指示、見出し、必ず入れたい言葉を分けて入力できると再生成しやすい",
    caution: "一つの自由欄だけでは、AIがどの指摘を重視すべきか判断しにくい",
  },
  {
    role: "個人情報・配慮確認",
    positive: "病名、詳細住所、揉めごとなどを本文へ入れず、公開されても差し支えない範囲に留める",
    caution: "入力があっても死因・病状・家族事情を本文で詳述しない",
  },
] as const;

export const originalLetterStructureRules = [
  "見出しは一行で置き、感情の軸を一つに決める",
  "会葬と弔意への御礼は短く端正に述べる",
  "中盤は家族目線の手紙として、入力にある事実から一つか二つの生活場面を描く",
  "故人の仕事・趣味・活動は略歴として並べず、家族がどう受け止めていたかを書く",
  "家族がこれから大切にしたい思い、または会葬者の言葉に支えられていることへつなげる",
  "結びは生前の厚情への感謝と、略儀ながら書中で礼を述べる定型へ戻す",
] as const;

export const originalLetterQualityRules = [
  "家族が『これはうちの人のことだ』と思える具体を最低一つ入れる",
  "情報が少ない場合は、故人像を創作せず、感謝と家族の記憶を控えめにまとめる",
  "本文はおおむね450〜760字を目安にする",
  "句読点は使わず、全角空白または改行で息継ぎを作る",
  "『私ども』『家族一同』は必要な箇所だけに留め、連発しない",
  "故人名は冒頭または中盤に自然に置き、本文全体で繰り返しすぎない",
  "喪主の修正指示がある場合は、現在本文より修正指示を優先する",
] as const;

export const originalLetterAvoidRules = [
  "生年月日から職歴へ続く履歴書のような構成にしない",
  "司会ナレーションのように『ご家族より伺いました』と書かない",
  "『故人の面影を偲んで』『歩んでまいりました』『在りし日のお姿』『皆様を見守っているよう』など読み上げ台本調の言葉に寄せない",
  "入力にない病名、死因、宗教観、家族関係、職業、地名、年齢を創作しない",
  "過度に泣かせる表現、悲嘆を強調する表現、断定的な美談を避ける",
  "時候の挨拶、拝啓・敬具、日付、住所、喪主名、親族一同を本文に入れない",
  "忌み言葉・重ね言葉を避ける",
] as const;

export const originalLetterTitlePatterns = [
  "ありがとうを伝える短い見出し",
  "故人の口癖や好きだった言葉を短く置く見出し",
  "家族が見た故人の姿を一言で表す見出し",
  "趣味や仕事に向き合う姿勢を一言にした見出し",
  "遺影写真や思い出の場面から始まる見出し",
] as const;

export function buildOriginalLetterSkillPrompt(): string {
  const expertLines = originalLetterExpertReviewLenses.flatMap((lens) => [
    `- ${lens.role} 肯定的視点: ${lens.positive}`,
    `- ${lens.role} 否定的視点: ${lens.caution}`,
  ]);

  return [
    "# オリジナル会葬礼状制作スキル",
    `- version: ${ORIGINAL_LETTER_SKILL_VERSION}`,
    "",
    "## 実例サンプルから抽出した傾向",
    ...originalLetterObservedPatterns.map((rule) => `- ${rule}`),
    "",
    "## 7人の専門家視点の統合",
    ...expertLines,
    "",
    "## 構成ルール",
    ...originalLetterStructureRules.map((rule) => `- ${rule}`),
    "",
    "## 品質ルール",
    ...originalLetterQualityRules.map((rule) => `- ${rule}`),
    "",
    "## 避けること",
    ...originalLetterAvoidRules.map((rule) => `- ${rule}`),
    "",
    "## 見出しの作り方",
    ...originalLetterTitlePatterns.map((rule) => `- ${rule}`),
  ].join("\n");
}
