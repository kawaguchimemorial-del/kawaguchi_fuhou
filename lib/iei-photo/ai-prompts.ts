/**
 * AI遺影写真生成のプロンプト定義（サーバー/クライアント両用・DOM非依存）
 *
 * 重要方針:
 * - 人物をAI生成する処理は「高度AI補正 / AI肖像生成 / AIに全てお任せ」の明示操作時のみ。
 * - 本人らしさを最優先し、別人化・過度な若返り・過剰な美肌化・顔の作り替えは避ける。
 * - clothingStyle="none" は「服装はそのまま」として扱い、元画像の服装維持を強く指示する。
 *
 * プロンプト統合順:
 *   1. 本人らしさ維持 → 2. 顔の特徴維持 → 3. 背景テーマ → 4. 服装維持/指定
 */

import type {
  IeiPhotoAiImageMode,
  IeiPhotoBackgroundType,
  IeiPhotoClothingStyle,
  IeiPhotoExpressionSettings,
  IeiPhotoPose,
} from "./types";

/**
 * 肩にかかった紐類の除去指示（全モード・服装指定に関わらず常に適用）。
 * リュック・ポーチ・バッグ・カメラ・IDカードなどの肩紐/ストラップは、
 * 遺影写真として不要なため、無指定でも自然に取り除く。
 */
/**
 * 髪の保持指示（全モード・背景指定に関わらず常に適用）。
 *
 * 背景を生成/差し替えると、髪と背景の境界をAIが作り直すため、
 * 白髪・薄毛・細い髪の方で「頭頂部がなめらかなドームに塗りつぶされる」
 * 「毛が1本ずつでなく霞になる」「境界に光の輪が出る」といった破綻が起きやすい。
 * ベースプロンプトの「髪型を保持」だけでは毛の質感まで伝わらないため、独立した指示として常に付ける。
 */
export const IEI_PHOTO_HAIR_PROMPT =
  "髪型は絶対に変えないでください。これは最優先の条件です。" +
  // ── 量・厚み。ここが最も壊れやすい（実データで頭頂部が潰れ、髪が頭に貼りついた） ──
  "特に髪の量と厚みを減らさないでください。頭頂部の髪の高さ、ふくらみ、立ち上がりを" +
  "元写真とまったく同じだけ残してください。髪を頭皮に貼りつかせる、なでつける、" +
  "押さえつける、濡れたように見せる、平らにする、頭を小さく細く見せる、" +
  "髪の外形を丸くきれいに整えることは、いずれも行わないでください。" +
  "毛束のかたまり感、ふくらみ、外へ跳ねた毛、輪郭からはみ出した毛先も、" +
  "1本残らず元写真のまま残してください。" +
  "仕上がりを元写真に重ねたとき、髪を含めた頭の外側の輪郭がほぼ一致している状態にしてください。" +
  // ── 形（長さ・分け目・位置） ──
  "元写真の髪の長さ（前髪・サイド・もみあげ・襟足）、分け目の位置と向き、" +
  "耳が髪に隠れているか出ているか、額の見え方、髪全体のボリュームと外形を、" +
  "そのまま1ミリも動かさずに残してください。" +
  "髪を切る、短くする、長くする、刈り上げる、整髪料でセットする、櫛で整える、" +
  "分け目を作り直す、前髪を上げる、耳を出す、耳を隠す、左右対称に整えることは、" +
  "いずれも行わないでください。" +
  "跳ねた毛、寝ぐせ、乱れ、まとまりのない部分、飛び出した毛も、そのままにしてください" +
  "（遺影写真として整えるのは明るさ・背景・服装だけで、髪は整える対象に含めません）。" +
  // ── 質感・境界 ──
  "髪は生え際、分け目、毛の流れ、毛先、後れ毛を元写真のとおりに保ってください。" +
  "白髪、細い髪、毛量の少ない部分、地肌が見えている部分も、元写真のまま1本ずつの毛の質感を残してください。" +
  "髪の輪郭をなめらかに塗りつぶす、髪の量を増やす、減らす、頭の形やシルエットを整形する、" +
  "生え際の位置を変えることは避けてください。" +
  "髪と背景の境界では、細い毛先が背景に自然になじむようにし、光の輪、白い縁取り、黒い縁取り、" +
  "貼り付けたような境目、不自然なぼかしを作らないでください。";

export const IEI_PHOTO_REMOVE_STRAP_PROMPT =
  "リュック、ポーチ、バッグ、カメラ、たすき、IDカードなどの肩や首からかかっている紐・ストラップ・ひもが写っている場合は、遺影写真として不要なため、指定がなくても自然に取り除いてください。紐を消した部分は、その下にある服や肩の生地が自然に続いているように補ってください。服装自体（色、柄、襟元、肩、袖）は変えず、紐だけを除去してください。";

/** モードごとの基本プロンプト（本人らしさ・顔特徴・背景明るさ補正を含む）。 */
export const IEI_PHOTO_AI_BASE_PROMPTS: Record<IeiPhotoAiImageMode, string> = {
  advanced:
    "遺影写真として自然で品のある写真に整えてください。人物の本人らしさ、顔の輪郭、目、鼻、口、髪型、眼鏡、ほくろ、シワ、服の印象をできるだけ保持してください。白飛び、強い影、色かぶり、背景との境界、全体の明るさを自然に補正してください。別人化、若返り、美化しすぎ、顔の作り替え、服の大幅変更は避けてください。背景は清潔な淡い無地または自然な遺影写真向け背景にしてください。",
  portrait:
    "元写真の人物を参考に、遺影写真として自然で品のある肖像写真を生成してください。本人らしさを最優先し、顔の特徴、髪型、眼鏡、ほくろ、シワ、表情の印象を可能な限り維持してください。強い白飛びや暗さを補い、落ち着いた背景、自然な照明、上半身の構図で仕上げてください。過度な若返り、別人化、過剰な美肌化、服や顔の不自然な作り替えは避けてください。",
  auto:
    "AIに全てお任せします。元写真の人物を参考に、遺影写真として最も自然で品のある仕上がりになるよう、背景、明るさ、色味、構図、服装、全体の印象を総合的に整えてください。本人らしさを最優先し、顔の特徴、髪型、眼鏡、ほくろ、シワ、表情の印象を可能な限り維持してください。白飛び、強い影、背景の乱れ、服装の違和感を自然に補い、遺影写真として落ち着いた印象にしてください。ただし、過度な若返り、別人化、過剰な美肌化、不自然な顔の作り替えは避けてください。",
};

/** 背景テーマごとの追加指示。背景は別画像合成ではなく AI に生成させる。 */
export const IEI_PHOTO_BACKGROUND_PROMPTS: Record<
  IeiPhotoBackgroundType,
  string
> = {
  // --- 単色系: 無地に近く、人物を引き立てる ---
  white:
    "背景は白を基調にした清潔で落ち着いた無地に近い背景にしてください。",
  light_gray:
    "背景は明るく落ち着いたグレー系にしてください。無地に近く、人物が自然に引き立つ遺影写真向けの背景にしてください。",
  brown:
    "背景は落ち着いたブラウン系にしてください。重くなりすぎず、人物の輪郭となじむ上品で温かみのある無地に近い背景にしてください。",
  orange:
    "背景はやわらかなオレンジ系にしてください。彩度を抑えた穏やかな色合いで、人物が自然に引き立つ遺影写真向けの背景にしてください。",
  yellow:
    "背景は淡いイエロー系にしてください。明るく穏やかで、派手にならないよう彩度を抑えた無地に近い背景にしてください。",
  green:
    "背景は淡いグリーン系にしてください。穏やかで安らぎのある色合いにし、人物の肌色を損なわない自然な背景にしてください。",
  pale_blue:
    "背景は淡いブルー系にしてください。清潔感があり、人物が自然に引き立つ遺影写真向けの背景にしてください。",
  purple:
    "背景は淡いパープル系にしてください。気品があり落ち着いた色合いで、人物の雰囲気を損なわない無地に近い背景にしてください。",
  pale_pink:
    "背景は淡いピンク系にしてください。柔らかく上品で、人物の雰囲気を損なわない自然な背景にしてください。",

  // --- 情景系: ごく淡く情景を感じさせる。人物より背景が目立たないこと ---
  awa_hikari:
    "背景はやわらかな光がふんわりと広がる、白を基調とした明るい情景にしてください。輪郭のはっきりした模様は描かず、静かで清らかな印象にしてください。",
  gin_setsu:
    "背景は静かに雪が舞う冬の空気を思わせる、銀白色の淡い情景にしてください。粒立ちは控えめにし、人物より背景が目立たないようにしてください。",
  kohaku_kasumi:
    "背景は琥珀色の光が霞のように広がる、暖かく落ち着いた情景にしてください。輪郭を作らず、やわらかなにじみで表現してください。",
  kouyou:
    "背景は紅葉の色合いをごく淡く溶かし込んだ、秋の穏やかな情景にしてください。葉の形をはっきり描かず、雰囲気だけを感じさせてください。",
  himawari:
    "背景は向日葵を思わせる明るい黄色の光が広がる情景にしてください。花の形は描かず、やわらかな光のにじみとして表現してください。",
  wakaba_gumo:
    "背景は若葉の緑がやわらかな雲のように広がる、清々しい情景にしてください。葉の形は描かず、穏やかなぼかしで表現してください。",
  sumizora:
    "背景は澄んだ空が上から下へ明るくひらけていく情景にしてください。雲の形ははっきり描かず、静かで清らかな印象にしてください。",
  awafuji_kasumi:
    "背景は藤の花のような淡い紫が霞のように広がる、気品のある情景にしてください。花や枝の形は描かず、やわらかなにじみで表現してください。",
  sakura_gumo:
    "背景は桜がひとかたまりの雲のようにやわらかく広がる、淡い春の情景にしてください。花びらの形ははっきり描かず、全体を霞ませてください。",
  sakura:
    "背景は淡い桜色を基調とした、春のやわらかな情景にしてください。花びらが少しだけ感じられる程度にとどめ、人物より背景が目立たないようにしてください。",

  // --- 旧データ互換 ---
  sky: "背景は穏やかで明るい空の雰囲気にしてください。人物の輪郭になじむ自然な光で、遺影写真として落ち着いた品のある背景にしてください。",
  warm_beige:
    "背景は淡いベージュ系にしてください。温かみがあり、派手すぎず、人物の輪郭となじむ自然な背景にしてください。",
  auto:
    "背景はAIが元写真の人物、服装、明るさに合わせて、遺影写真として最も自然で品のあるものを生成してください。",
  gradient:
    "背景は淡いグラデーションにしてください。人物の輪郭になじむ自然で上品な背景にしてください。",
  photo:
    "背景は遺影写真として自然で品のある淡い背景にしてください。既存の別背景画像を貼り付けたような不自然な合成は避けてください。",
};

/** 服装ごとの追加指示（none は服装維持）。 */
export const IEI_PHOTO_CLOTHING_PROMPTS: Record<IeiPhotoClothingStyle, string> =
  {
    none:
      "服装は元画像のまま維持してください。服の色、柄、襟元、肩、袖、素材感、見えている形を変えず、喪服、スーツ、和装、別のフォーマル服などに置き換えないでください。服が一部不足している場合も、見えている服と同じ雰囲気で自然に延長するだけにしてください。",
    mourning_japanese:
      "服装は落ち着いた正式な喪服の和装にしてください。葬儀用として自然で品のある印象にしてください。",
    mourning_western:
      "服装は落ち着いた正式な喪服の洋装にしてください。葬儀用として自然で品のある印象にしてください。",
    suit:
      "服装は落ち着いたフォーマルなスーツにしてください。遺影写真として自然で上品な印象にしてください。",
    casual:
      "服装は落ち着いた清潔感のあるカジュアル服にしてください。派手すぎず、自然で品のある印象にしてください。",
  };

/**
 * 服の見本画像を一緒に送るときの指示。
 * 見本は「頭部の無いトルソーに着せた服」なので、体型・姿勢・背景まで真似されると別人になる。
 * 使ってよいのは服だけであることを、繰り返し言い切る。
 */
export const IEI_PHOTO_CLOTHING_REFERENCE_PROMPT =
  "2枚目の画像は服装の見本です。1枚目の人物に、この見本と同じ服を着せてください。" +
  "見本から取り入れてよいのは、服の種類・色・柄・襟元の形・素材感だけです。" +
  "見本のトルソー（人台）、体型、肩幅、姿勢、向き、背景、明るさは一切使わないでください。" +
  "1枚目の人物の顔、肌、体格、肩の位置と幅、顔の向き、構図は元のまま変えないでください。" +
  "髪型は特に変えないでください。髪の長さ、前髪、もみあげ、襟足、分け目、ボリューム、跳ねた毛まで元のままにし、" +
  "服に合わせて髪を整えることは絶対にしないでください。" +
  "服は、その方の体に合わせて自然に着ている状態にし、切り貼りしたような境目、浮き、ずれを作らないでください。" +
  "首元と肩のつながりが自然になるようにしてください。";

/** UI 表示用の服装ラベル。 */
export const IEI_PHOTO_CLOTHING_LABELS: Record<IeiPhotoClothingStyle, string> = {
  none: "服装はそのまま",
  mourning_japanese: "喪服（和装）",
  mourning_western: "喪服（洋装）",
  suit: "スーツ",
  casual: "カジュアル",
};

/** UI のボタン表示順。 */
export const IEI_PHOTO_CLOTHING_ORDER: IeiPhotoClothingStyle[] = [
  "none",
  "mourning_japanese",
  "mourning_western",
  "suit",
  "casual",
];

/** 体勢・向きごとの追加指示（none は追加なし）。 */
export const IEI_PHOTO_POSE_PROMPTS: Record<IeiPhotoPose, string> = {
  none: "",
  front:
    "人物の顔と上半身をできるだけ正面に向け、まっすぐカメラを見ている構図にしてください。",
  slight_right: "人物の顔をやや右斜めに向けた、落ち着いた構図にしてください。",
  slight_left: "人物の顔をやや左斜めに向けた、落ち着いた構図にしてください。",
  upright: "背筋を伸ばし、落ち着いた自然な姿勢に整えてください。",
};

/** UI 表示用の体勢ラベル。 */
export const IEI_PHOTO_POSE_LABELS: Record<IeiPhotoPose, string> = {
  none: "指定なし",
  front: "正面を向く",
  slight_right: "やや右向き",
  slight_left: "やや左向き",
  upright: "姿勢を正す",
};

/** UI のボタン表示順。 */
export const IEI_PHOTO_POSE_ORDER: IeiPhotoPose[] = [
  "none",
  "front",
  "slight_right",
  "slight_left",
  "upright",
];

function buildExpressionPrompt(
  expression?: IeiPhotoExpressionSettings,
): string {
  if (!expression?.enabled) {
    return "";
  }

  const parts: string[] = [
    "表情の調整は元写真の人物らしさを最優先し、顔の輪郭、目や口の形、年齢感を大きく変えない範囲で自然に行ってください。",
  ];

  if (expression.smile === "slight") {
    parts.push("口元をほんの少しだけやわらげ、控えめで穏やかな微笑みにしてください。");
  } else if (expression.smile === "natural") {
    parts.push("遺影写真として自然で品のある微笑みにしてください。笑顔を強くしすぎないでください。");
  } else if (expression.smile === "broad") {
    parts.push("明るく満面の笑みに近い表情にしてください。ただし別人のような口元や過剰な笑顔にはしないでください。");
  }

  if (expression.eyeBrightness) {
    parts.push(
      "目元の明るさは自動で自然に整え、清潔感のあるハイライトを少し加えてください。目の形、大きさ、視線は変えないでください。",
    );
  }

  if (expression.teethVisibility === "closed") {
    parts.push("口は自然に閉じ、歯は見せない表情にしてください。");
  } else if (expression.teethVisibility === "slight") {
    parts.push(
      "歯は少しだけ見える程度にし、口元を自然に整えてください。不自然な歯並びや作り替えは避けてください。",
    );
  } else if (expression.teethVisibility === "clear") {
    parts.push(
      "歯がしっかり見える明るい表情にしてください。ただし歯や口元が不自然にならないよう、本人らしさを保ってください。",
    );
  }

  return parts.join(" ");
}

function buildCompositionPrompt(
  clothingStyle: IeiPhotoClothingStyle = "none",
): string {
  const parts: string[] = [
    "入力画像の人物サイズ、顔の大きさ、顔の位置、余白、構図をできるだけ維持してください。構図・サイズ調整で人物が小さめに配置されている場合も、その比率のまま遺影写真として仕上げ、AI生成時に顔だけを勝手に拡大しないでください。",
    "キャンバス内で肩、胸元、服の一部が不足している場合は、顔の大きさや位置を変えずに、自然な首元、肩、上半身、服の足りない部分だけを補ってください。元写真に服、襟元、肩が見えている場合は、その服装と形をできるだけ維持してください。",
  ];

  if (clothingStyle !== "none") {
    parts.push(
      "服装指定を反映する場合も、顔部分のサイズ、顔の位置、表情、本人らしさはそのまま保ち、服装だけを自然に当てはめてください。",
    );
  } else {
    parts.push(
      "服装はそのままの場合、見えている服装を最優先で維持してください。服の色、柄、襟、肩、袖、布の質感、花柄や模様を変更しないでください。不足部分は同じ服が続いているように補うだけにし、別の服・喪服・スーツ・無地の服へ変えないでください。",
    );
  }

  return parts.join(" ");
}

/**
 * 人物レイヤー用のプロンプトを組み立てる。
 *
 * 背景と人物を1回のAI生成でまとめて作らせると、変更範囲が大きくなり、
 * gpt-image が写真を「編集」ではなく「描き直し」に倒れて別人が出る
 * （2026-08-04 に実データで発生）。そこで背景の指示を一切含めず、
 * 人物だけを切り抜いた透過画像として作らせる。背景はこちらで描いて後から重ねる。
 */
export function buildPersonLayerPrompt(
  mode: IeiPhotoAiImageMode,
  clothingStyle: IeiPhotoClothingStyle,
  pose: IeiPhotoPose,
  expression?: IeiPhotoExpressionSettings,
  extraPrompt?: string,
  hasClothingReference = false,
): string {
  const parts: string[] = [
    "元の写真から人物（と、人物が手に持っているもの）だけを取り出し、背景を完全に透明にしてください。",
    "背景の描画・置き換え・色付けは一切しないでください。透明のままにしてください。",
    IEI_PHOTO_AI_BASE_PROMPTS[mode],
    IEI_PHOTO_HAIR_PROMPT,
  ];
  if (hasClothingReference) {
    parts.push(IEI_PHOTO_CLOTHING_REFERENCE_PROMPT);
  } else {
    const clothing = IEI_PHOTO_CLOTHING_PROMPTS[clothingStyle];
    if (clothing) parts.push(clothing);
  }
  parts.push(buildCompositionPrompt(clothingStyle));
  parts.push(IEI_PHOTO_REMOVE_STRAP_PROMPT);
  parts.push(
    "人物の輪郭、特に髪の毛先やほつれ毛は、透明な背景に対して自然に透けるようにしてください。" +
      "輪郭に白いフチ、黒いフチ、光の輪、元の背景の色が残った縁、貼り付けたような境目を作らないでください。" +
      "元の背景に写っていたもの（壁、飾り、家具、他の人）は、透明にして完全に取り除いてください。",
  );
  const poseText = IEI_PHOTO_POSE_PROMPTS[pose];
  if (poseText) parts.push(poseText);
  const expressionText = buildExpressionPrompt(expression);
  if (expressionText) parts.push(expressionText);
  const extra = extraPrompt?.trim();
  if (extra) parts.push(extra);
  return parts.join(" ");
}

/**
 * 最終プロンプトを組み立てる。
 * 統合順: 本人らしさ・顔特徴・背景明るさ（基本）→ 服装 → 体勢・向き → 追加指示。
 */
export function buildAiPrompt(
  mode: IeiPhotoAiImageMode,
  clothingStyle: IeiPhotoClothingStyle,
  pose: IeiPhotoPose,
  backgroundType: IeiPhotoBackgroundType = "auto",
  backgroundGradient = false,
  expression?: IeiPhotoExpressionSettings,
  extraPrompt?: string,
  /** 服の見本画像を同時に送るか。送る場合は文字の説明より見本を優先させる。 */
  hasClothingReference = false,
): string {
  // 髪型は最も壊れやすく、変わると一目で別人に見えるため、基本方針の直後に置く。
  // （以前は服装・構図の後ろだったが、実写真で髪が短く切り揃えられる事例が出た）
  const parts: string[] = [IEI_PHOTO_AI_BASE_PROMPTS[mode], IEI_PHOTO_HAIR_PROMPT];
  parts.push(IEI_PHOTO_BACKGROUND_PROMPTS[backgroundType]);
  if (backgroundGradient) {
    parts.push(
      "背景は選択した色を基調に、淡く自然な縦方向のグラデーションにしてください。急な色変化や派手な模様は避け、人物の輪郭になじませてください。",
    );
  }
  if (hasClothingReference) {
    // 見本画像がある場合は、文字の説明（「喪服の和装にして」等）より見本を正とする。
    parts.push(IEI_PHOTO_CLOTHING_REFERENCE_PROMPT);
  } else {
    const clothing = IEI_PHOTO_CLOTHING_PROMPTS[clothingStyle];
    if (clothing) {
      parts.push(clothing);
    }
  }
  parts.push(buildCompositionPrompt(clothingStyle));
  parts.push(IEI_PHOTO_REMOVE_STRAP_PROMPT);
  const poseText = IEI_PHOTO_POSE_PROMPTS[pose];
  if (poseText) {
    parts.push(poseText);
  }
  const expressionText = buildExpressionPrompt(expression);
  if (expressionText) {
    parts.push(expressionText);
  }
  const extra = extraPrompt?.trim();
  if (extra) {
    parts.push(extra);
  }
  return parts.join(" ");
}

export function buildWideMonitorPrompt(
  backgroundType: IeiPhotoBackgroundType = "auto",
  backgroundGradient = false,
  extraPrompt?: string,
): string {
  const parts: string[] = [
    "16:9モニター用の横長遺影写真として自然に仕上げてください。中央の人物、顔、髪型、表情、服装、位置、サイズ、中央背景はできるだけ維持してください。透明マスクで指定された左右部分だけを編集し、中央の人物を別人化、若返り、美化しすぎ、拡大縮小、移動しないでください。",
    "人物はモニター表示で見やすい大きめの上半身構図にし、顔は画面の縦中央ではなく中央より少し上に配置してください。頭上の余白を広く取りすぎず、肩から胸元が下部に大きく入る構図を維持し、引きの構図にはしないでください。",
    "左右部分は中央背景と同じ光、色、質感の自然な背景として生成してください。左右には人物の顔、髪、肌、服、肩、腕、手を複製、反転、ぼかし拡大、残像として出さないでください。縦の切れ目、境界線、貼り付け感が見えないように、1枚の横長写真として自然につなげてください。",
  ];
  parts.push(IEI_PHOTO_BACKGROUND_PROMPTS[backgroundType]);
  // 左右を継ぎ足す際に中央の髪の輪郭が描き直されないようにする
  parts.push(IEI_PHOTO_HAIR_PROMPT);
  if (backgroundGradient) {
    parts.push(
      "背景は選択した色を基調に、左右まで自然につながる淡いグラデーションにしてください。急な色変化や派手な模様は避けてください。",
    );
  }
  const extra = extraPrompt?.trim();
  if (extra) {
    parts.push(extra);
  }
  return parts.join(" ");
}
