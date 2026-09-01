/**
 * AI遺影の「服装」カタログ。
 *
 * 以前は文字のボタン（喪服（和装）／喪服（洋装）／スーツ／カジュアル）だけで、
 * 出来上がりが想像できず、カジュアルに至っては何が出てくるか分からなかった。
 * ここでは服の見本写真を用意し、それを選んで着せ替える方式にする。
 *
 * 見本写真は scripts/gen-clothing-samples.mjs で生成し、
 * public/iei-clothing/<id>.webp に置く（顔は写さず、服だけが分かる見本）。
 * ※ /iei-photo 配下に置くと middleware の保護対象と重なり、画像だけ認証で弾かれて
 *   表示できなくなる（実際に踏んだ）。保護対象と重ならない場所に置くこと。
 * 生成時はこの見本画像を参照として渡し、元写真の顔・髪・体格はそのままに服だけを替える。
 */

/** 見本の性別。同じ「スーツ」でも仕立てが違うため分けている。 */
export type IeiPhotoClothingGender = "male" | "female";

/** 服の系統。プロンプトの言い回しと並び順に使う。 */
export type IeiPhotoClothingCategory =
  | "mourning_japanese" // 喪服（和装）
  | "mourning_western" // 喪服（洋装）
  | "suit" // スーツ
  | "casual"; // カジュアル（10パターン）

export type IeiPhotoClothingItem = {
  /** 保存ファイル名にもなる識別子。生成済み画像との対応を変えないこと。 */
  id: string;
  gender: IeiPhotoClothingGender;
  category: IeiPhotoClothingCategory;
  /** 選択欄に出す短い名前。 */
  label: string;
  /** 見本画像の生成に使う説明（日本語で持ち、スクリプト側で英訳せずそのまま渡す）。 */
  sample: string;
};

export const IEI_PHOTO_CLOTHING_CATEGORY_LABELS: Record<
  IeiPhotoClothingCategory,
  string
> = {
  mourning_japanese: "喪服（和装）",
  mourning_western: "喪服（洋装）",
  suit: "スーツ",
  casual: "カジュアル",
};

export const IEI_PHOTO_CLOTHING_CATEGORY_ORDER: IeiPhotoClothingCategory[] = [
  "mourning_japanese",
  "mourning_western",
  "suit",
  "casual",
];

export const IEI_PHOTO_CLOTHING_GENDER_LABELS: Record<
  IeiPhotoClothingGender,
  string
> = { male: "男性", female: "女性" };

/**
 * 見本の一覧。喪服（和装）・喪服（洋装）・スーツは各1点、カジュアルは10点。
 * カジュアルは、ご遺族が「その方らしい普段の姿」を選べるよう、
 * 改まったものから普段着まで幅を持たせている（派手・露出の多いものは入れない）。
 */
export const IEI_PHOTO_CLOTHING_ITEMS: IeiPhotoClothingItem[] = [
  // ── 男性 ────────────────────────────────────────────────
  {
    id: "male_mourning_japanese",
    gender: "male",
    category: "mourning_japanese",
    label: "喪服（和装）",
    sample: "日本の男性用の正式な黒紋付羽織袴。黒の羽織に白い羽織紐、下は黒の着物。",
  },
  {
    id: "male_mourning_western",
    gender: "male",
    category: "mourning_western",
    label: "喪服（洋装）",
    sample: "日本の男性用の喪服。黒のシングルスーツに白いワイシャツ、黒の無地ネクタイ。",
  },
  {
    id: "male_suit",
    gender: "male",
    category: "suit",
    label: "スーツ",
    sample: "濃紺の落ち着いたビジネススーツ。白いワイシャツに、深い色の無地ネクタイ。",
  },
  {
    id: "male_casual_01",
    gender: "male",
    category: "casual",
    label: "ジャケット",
    sample: "紺のジャケットに白いシャツ。ネクタイは締めない、少し寛いだ装い。",
  },
  {
    id: "male_casual_02",
    gender: "male",
    category: "casual",
    label: "カーディガン",
    sample: "ベージュのカーディガンに、淡い水色の襟付きシャツ。",
  },
  {
    id: "male_casual_03",
    gender: "male",
    category: "casual",
    label: "ニットベスト",
    sample: "茶色のニットベストに白い襟付きシャツ。落ち着いた年配の男性の装い。",
  },
  {
    id: "male_casual_04",
    gender: "male",
    category: "casual",
    label: "セーター",
    sample: "落ち着いた紺色のセーター。首元から白いシャツの襟がのぞく。",
  },
  {
    id: "male_casual_05",
    gender: "male",
    category: "casual",
    label: "シャツ",
    sample: "淡い水色の襟付きシャツ一枚。清潔感のある普段着。",
  },
  {
    id: "male_casual_06",
    gender: "male",
    category: "casual",
    label: "ポロシャツ",
    sample: "落ち着いた深緑色のポロシャツ。",
  },
  {
    id: "male_casual_07",
    gender: "male",
    category: "casual",
    label: "作務衣",
    sample: "紺色の作務衣。日本の和風の普段着。",
  },
  {
    id: "male_casual_08",
    gender: "male",
    category: "casual",
    label: "和装（着物）",
    sample: "落ち着いた灰茶色の男性用の着物に羽織。礼装ではない普段の和装。",
  },
  {
    id: "male_casual_09",
    gender: "male",
    category: "casual",
    label: "チェックシャツ",
    sample: "落ち着いた色合いの細かいチェック柄の襟付きシャツ。",
  },
  {
    id: "male_casual_10",
    gender: "male",
    category: "casual",
    label: "ベスト",
    sample: "濃いグレーのベストに白いシャツ。袖はシャツのまま。",
  },

  // ── 女性 ────────────────────────────────────────────────
  {
    id: "female_mourning_japanese",
    gender: "female",
    category: "mourning_japanese",
    label: "喪服（和装）",
    sample: "日本の女性用の正式な黒紋付の着物。黒の帯、控えめな白い半襟。",
  },
  {
    id: "female_mourning_western",
    gender: "female",
    category: "mourning_western",
    label: "喪服（洋装）",
    sample: "日本の女性用の喪服。黒のジャケットと黒のワンピース、襟元は詰まっている。",
  },
  {
    id: "female_suit",
    gender: "female",
    category: "suit",
    label: "スーツ",
    sample: "濃紺の落ち着いた女性用のスーツ。中は白いブラウス。",
  },
  {
    id: "female_casual_01",
    gender: "female",
    category: "casual",
    label: "ジャケット",
    sample: "淡いグレーのジャケットに白いブラウス。少し寛いだ装い。",
  },
  {
    id: "female_casual_02",
    gender: "female",
    category: "casual",
    label: "カーディガン",
    sample: "淡いピンクベージュのカーディガンに、白いブラウス。",
  },
  {
    id: "female_casual_03",
    gender: "female",
    category: "casual",
    label: "ブラウス",
    sample: "白い上品なブラウス。襟元にささやかなフリル。",
  },
  {
    id: "female_casual_04",
    gender: "female",
    category: "casual",
    label: "ニット",
    sample: "落ち着いた薄紫色のニット。首元は詰まっている。",
  },
  {
    id: "female_casual_05",
    gender: "female",
    category: "casual",
    label: "花柄ブラウス",
    sample: "淡い色の小さな花柄のブラウス。派手すぎない上品な柄。",
  },
  {
    id: "female_casual_06",
    gender: "female",
    category: "casual",
    label: "ワンピース",
    sample: "落ち着いた紺色のワンピース。襟元は詰まった上品な形。",
  },
  {
    id: "female_casual_07",
    gender: "female",
    category: "casual",
    label: "ストール",
    sample: "白いブラウスの肩に、淡いベージュのストールを掛けた装い。",
  },
  {
    id: "female_casual_08",
    gender: "female",
    category: "casual",
    label: "和装（着物）",
    sample: "淡い藤色の小紋の着物。礼装ではない普段の和装。",
  },
  {
    // 「和装にしたいが黒の喪服は避けたい」というご要望のために足した明るい和装。
    id: "female_kimono_beige",
    gender: "female",
    category: "casual",
    label: "和装（ベージュ）",
    sample:
      "淡いベージュ（生成り）の色無地の着物。控えめな金茶の帯、白い半襟。落ち着いた上品な和装。",
  },
  {
    id: "female_casual_09",
    gender: "female",
    category: "casual",
    label: "ベスト",
    sample: "落ち着いたベージュのニットベストに、白いブラウス。",
  },
  {
    id: "female_casual_10",
    gender: "female",
    category: "casual",
    label: "スカーフ",
    sample: "白いブラウスの首元に、落ち着いた色の小さなスカーフを結んだ装い。",
  },
];

/** 見本画像の公開パス。 */
export function clothingSampleUrl(id: string): string {
  return `/iei-clothing/${id}.webp`;
}

export function findClothingItem(
  id: string | null | undefined,
): IeiPhotoClothingItem | null {
  if (!id) return null;
  return IEI_PHOTO_CLOTHING_ITEMS.find((i) => i.id === id) ?? null;
}

/** 指定の性別の見本を、系統の並び順で返す。 */
export function clothingItemsByGender(
  gender: IeiPhotoClothingGender,
): IeiPhotoClothingItem[] {
  return IEI_PHOTO_CLOTHING_ITEMS.filter((i) => i.gender === gender).sort(
    (a, b) =>
      IEI_PHOTO_CLOTHING_CATEGORY_ORDER.indexOf(a.category) -
      IEI_PHOTO_CLOTHING_CATEGORY_ORDER.indexOf(b.category),
  );
}
