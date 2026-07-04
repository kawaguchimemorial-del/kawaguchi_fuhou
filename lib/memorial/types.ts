// 訃報ドメインの型。DBスキーマ(supabase/migrations/0001)と対応。
// Supabase接続後は types/database.ts(自動生成)から導出する想定だが、
// UI層はこのドメイン型に依存させ、DB都合の変更から画面を守る。

export type ReligionType =
  | "仏式"
  | "浄土真宗"
  | "神式"
  | "キリスト教式"
  | "無宗教"
  | "中立";

export type FuneralStyle = "family" | "general" | "direct";
export type MemorialStatus = "draft" | "published" | "closed" | "archived";
export type AccessLevel = "public" | "unlisted" | "passcode" | "invite_only";
export type EventType = "通夜" | "葬儀" | "告別式" | "出棺" | "火葬" | "法要";

export interface Deceased {
  nameKanji: string;
  nameKana?: string;
  rubyHtml?: string; // サニタイズ済みのrubyマークアップ
  posthumousName?: string; // 戒名・法名
  ageKazoe?: number; // 享年
  ageFull?: number; // 行年
  birthDate?: string;
  deathDate?: string;
  portraitPath?: string;
  portraitAlt?: string;
  bioText?: string;
  relationToMourner?: string;
}

export interface FuneralEvent {
  id: string;
  eventType: EventType;
  startAt?: string;
  endAt?: string;
  datetimeLabel?: string; // 未確定/和暦表記など表示優先
  venueName?: string;
  venueAddress?: string;
  lat?: number;
  lng?: number;
  mapUrl?: string;
  parkingNote?: string;
  accessText?: string;
  receptionTime?: string;
  liveStreamUrl?: string;
}

export interface ChiefMourner {
  nameKanji: string;
  relation?: string; // 故人との続柄
}

// 祭壇レイヤー設定（実物の「祭壇設定画面」を踏襲。素材を重ね合成）
export type AltarFrame = "黒" | "黒リボン" | "白" | "白花" | "グレー" | "紫" | "ピンク";
export type AltarSideFlower = "黒" | "白" | "花1" | "花2";
export type AltarCenter =
  | "焼香黒" | "焼香白" | "線香1" | "線香2" | "線香3" | "花1" | "花2" | "非表示";
export type AltarTop = "黒" | "木目";
export type AltarBackground = "七宝" | "菊" | "波" | "ドレープベージュ" | "ドレープピンク";

export interface AltarConfig {
  portraitPath?: string;
  frame: AltarFrame;
  sideFlower: AltarSideFlower;
  center: AltarCenter;
  top: AltarTop;
  background: AltarBackground;
}

export interface OnlineVenue {
  venueName: string; // オンライン式名
  greetingHeading: string; // 喪主挨拶
  greetingBody: string;
  greetingSignature: string; // 喪主名
  openFrom?: string;
  openUntil?: string;
  openDays?: number; // 公開期間（日）
  requireManagementNo: boolean; // 入場時 管理番号
  requireAttendeeName: boolean; // 入場時 参列者名
  showOfferings: boolean; // 供花供物/贈答品の表示
  ceremonyPhotoPath?: string; // 葬儀の写真（円形・旧仕様。scenePathsへ移行）
  scenePaths?: string[]; // 葬儀の様子（複数写真）
  albumPaths: string[]; // アルバム
  videos?: { title?: string; vimeoId: string }[]; // 動画（Vimeo）
  youtube?: { title?: string; url: string }[]; // YouTubeライブ配信
  altar: AltarConfig;
}

export interface Memorial {
  id: string;
  slug: string;
  status: MemorialStatus;
  testMode: boolean; // テスト案件（赤帯表示）
  accessLevel: AccessLevel;
  noindex: boolean;
  religionType: ReligionType;
  funeralStyle?: FuneralStyle;
  obituaryTitle: string; // 既定「訃報」
  obituaryBody?: string; // 訃報本文（500字以内）
  kodenDecline: boolean;
  flowerDecline: boolean;
  attendDecline: boolean;
  kodenAcceptUntil?: string;
  offeringAcceptUntil?: string;
  publishedAt?: string;
  funeralHomeName?: string;
  funeralHomeContact?: { phone?: string; email?: string; url?: string };
  deceased: Deceased;
  events: FuneralEvent[];
  chiefMourner?: ChiefMourner;
  venue?: OnlineVenue; // 「訃報+式場」タイプのみ
}
