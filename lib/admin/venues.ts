// 会館（式場）マスタ。設定で登録した会館をウィザードの「場所」で選択できる。
// TODO(supabase): funeral_home_venues テーブルから葬儀社単位で取得。
export interface VenueMaster {
  id: string;
  name: string;
  postalCode: string;
  address: string;
  phone?: string;
  url?: string;
}

export const VENUE_MASTER: VenueMaster[] = [
  {
    id: "kawaguchi-memorial",
    name: "川口メモリアルホール",
    postalCode: "3330833",
    address: "埼玉県川口市西新井宿440-1",
    phone: "0120-963-765",
    url: "https://kawaguchitenrei.com/",
  },
  {
    id: "kawaguchi-honten",
    name: "川口典礼 本店ホール",
    postalCode: "3320000",
    address: "埼玉県川口市本町〇-〇-〇",
    phone: "0120-963-765",
  },
];
