// 宗派ごとの語彙・所作の出し分け。未設定/中立は失礼にならない中立表現にフェイルセーフ。
// 仕様: 浄土真宗では「ご冥福」「霊前」等を使わない等の配慮を辞書化。
import type { ReligionType } from "./types";

export interface ReligionVocab {
  /** バーチャル参拝の所作名（焼香/玉串奉奠/献花） */
  worshipLabel: string;
  /** 参拝動詞（「お焼香する」等） */
  worshipAction: string;
  /** 香典の表書き既定 */
  kodenHyogaki: string;
  /** 弔意の定型語（「ご冥福をお祈りします」等） */
  condolencePhrase: string;
  /** 故人を指す敬語表現 */
  deceasedHonorific: string;
}

const VOCAB: Record<ReligionType, ReligionVocab> = {
  仏式: {
    worshipLabel: "焼香",
    worshipAction: "お焼香する",
    kodenHyogaki: "御霊前",
    condolencePhrase: "心よりご冥福をお祈り申し上げます",
    deceasedHonorific: "故人",
  },
  浄土真宗: {
    // 浄土真宗は逝去後すぐ成仏する教義のため「御霊前」「ご冥福」を用いない
    worshipLabel: "焼香",
    worshipAction: "お焼香する",
    kodenHyogaki: "御仏前",
    condolencePhrase: "謹んでお悔やみ申し上げます",
    deceasedHonorific: "ご門徒",
  },
  神式: {
    worshipLabel: "玉串奉奠",
    worshipAction: "玉串を捧げる",
    kodenHyogaki: "御榊料",
    condolencePhrase: "御霊のご平安をお祈り申し上げます",
    deceasedHonorific: "御霊",
  },
  キリスト教式: {
    worshipLabel: "献花",
    worshipAction: "献花する",
    kodenHyogaki: "御花料",
    condolencePhrase: "安らかなお眠りをお祈り申し上げます",
    deceasedHonorific: "故人",
  },
  無宗教: {
    worshipLabel: "献花",
    worshipAction: "献花する",
    kodenHyogaki: "御花料",
    condolencePhrase: "謹んでお悔やみ申し上げます",
    deceasedHonorific: "故人",
  },
  中立: {
    worshipLabel: "献花",
    worshipAction: "お気持ちを捧げる",
    kodenHyogaki: "御香典",
    condolencePhrase: "謹んでお悔やみ申し上げます",
    deceasedHonorific: "故人",
  },
};

export function religionVocab(religion: ReligionType): ReligionVocab {
  return VOCAB[religion] ?? VOCAB["中立"];
}
