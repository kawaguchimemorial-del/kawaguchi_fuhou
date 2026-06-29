import "server-only";

// 管理画面用の暫定データ。実顧客情報は使わずダミー。
// TODO(supabase): memorials/deceased/funeral_events 等から葬儀社(funeral_home_id)単位で取得。

export interface CeremonyListItem {
  id: string;
  slug: string;
  type: "訃報のみ" | "訃報+式場";
  isTest: boolean;
  mournerName: string;
  deceasedName: string;
  event1: { name: string; date: string };
  event2?: { name: string; date: string };
  publishFrom: string;
  publishUntil: string;
  flowerDeadline?: string;
  offeringDeadline?: string;
  giftDeadline?: string;
  status: "公開中" | "下書き" | "終了";
  kodenOption: "利用する" | "利用しない";
  memo?: string;
}

export interface KodenEntry {
  id: string;
  registeredAt: string;
  mournerName: string;
  deceasedName: string;
  event1: string;
  event2?: string;
  donorName: string;
  amountJpy: number;
}

const CEREMONIES: CeremonyListItem[] = [
  {
    id: "c1",
    slug: "sample-haruko",
    type: "訃報+式場",
    isTest: true,
    mournerName: "山田 太郎",
    deceasedName: "山田 哲夫",
    event1: { name: "一日葬", date: "2026/07/01(水)" },
    publishFrom: "2026/06/29 08:41",
    publishUntil: "2026/08/28 08:41",
    flowerDeadline: "06/30(火) 08:30",
    status: "公開中",
    kodenOption: "利用する",
    memo: "",
  },
  {
    id: "c2",
    slug: "sample-2",
    type: "訃報のみ",
    isTest: false,
    mournerName: "佐藤 花子",
    deceasedName: "佐藤 一郎",
    event1: { name: "通夜式", date: "2026/06/14(日)" },
    event2: { name: "告別式", date: "2026/06/15(月)" },
    publishFrom: "2026/06/10 16:19",
    publishUntil: "2026/08/09 16:19",
    flowerDeadline: "06/14(日) 12:00",
    status: "公開中",
    kodenOption: "利用しない",
  },
];

const KODEN: KodenEntry[] = [
  { id: "k1", registeredAt: "2026/04/03 20:48", mournerName: "佐藤 花子", deceasedName: "佐藤 一郎", event1: "2026/04/04(土)", donorName: "前田 好夫", amountJpy: 30000 },
  { id: "k2", registeredAt: "2026/04/03 14:32", mournerName: "佐藤 花子", deceasedName: "佐藤 一郎", event1: "2026/04/04(土)", donorName: "宮田 智哉", amountJpy: 5000 },
  { id: "k3", registeredAt: "2026/04/02 12:29", mournerName: "佐藤 花子", deceasedName: "佐藤 一郎", event1: "2026/04/04(土)", donorName: "海老原 愛莉", amountJpy: 3000 },
];

export async function listCeremonies(): Promise<CeremonyListItem[]> {
  return CEREMONIES;
}
export async function listKoden(): Promise<KodenEntry[]> {
  return KODEN;
}
export async function getFuneralHomeName(): Promise<string> {
  return "株式会社川口典礼 本社";
}
