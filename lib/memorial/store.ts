import "server-only";

// 開発用の一時インメモリストア。サーバー再起動で消える。
// TODO(supabase): 各配列を Supabase テーブル（virtual_worships / condolence_messages /
//   offering_orders）への INSERT に置き換える。RLSとモデレーションは仕様 docs/01 第3章参照。

export interface WorshipRecord {
  id: string;
  memorialSlug: string;
  worshipType: string; // 焼香/玉串奉奠/献花
  displayName: string | null;
  isAnonymous: boolean;
  message: string | null;
  createdAt: string;
}

export interface MessageRecord {
  id: string;
  memorialSlug: string;
  senderName: string;
  body: string;
  moderationStatus: "pending" | "approved" | "rejected" | "hidden";
  createdAt: string;
}

export interface OrderRecord {
  id: string;
  memorialSlug: string;
  productId: string;
  quantity: number;
  unitPriceAtOrder: number;
  ordererName: string;
  ordererKana: string;
  company: string | null;
  postalCode: string;
  address: string;
  phone: string;
  email: string;
  namePlateText: string;
  oldCharRequested: boolean;
  invoiceName: string | null;
  memo: string | null;
  status: "pending_confirm" | "provisional" | "captured" | "canceled";
  createdAt: string;
}

export interface KodenRecord {
  id: string;
  memorialSlug: string;
  donorName: string;
  donorCompany: string | null;
  amountJpy: number;
  hyogaki: string; // 表書き（御霊前/御仏前/御花料 等）
  feePayer: "sender" | "recipient"; // 手数料負担者
  message: string | null;
  isAmountPublic: boolean;
  // 決済状態（実際の確定はWebhookが唯一の真実源）
  status: "requires_payment" | "processing" | "succeeded" | "refunded" | "failed";
  providerPaymentIntentId: string | null;
  idempotencyKey: string;
  createdAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __memorialStore:
    | {
        worships: WorshipRecord[];
        messages: MessageRecord[];
        orders: OrderRecord[];
        koden: KodenRecord[];
        seq: number;
      }
    | undefined;
}

export const store =
  globalThis.__memorialStore ??
  (globalThis.__memorialStore = {
    worships: [],
    messages: [],
    orders: [],
    koden: [],
    seq: 1,
  });

export function nextId(prefix: string): string {
  return `${prefix}_${store.seq++}_${Date.now().toString(36)}`;
}
