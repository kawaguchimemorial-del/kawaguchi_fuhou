import { NextResponse, type NextRequest } from "next/server";

/**
 * 管理系ルートのBasic認証。
 *
 * 経緯: /account/sign-in が認証していないデモ実装で、middleware も無かったため、
 * URLを知っていれば誰でも管理画面（顧客・請求・本番決済の返金）に入れる状態だった。
 * 恒久対応（Supabase Auth による実ログイン）までの応急処置として、
 * ブラウザ標準のBasic認証で1枚壁を置く。
 *
 * 保護しない（＝一般の方・外部サービスが使う）:
 *   /m/*            訃報案内・オンライン式場・供花注文（参列者）
 *   /mypage/*       遺族マイページ（別途ログインあり）
 *   /api/webhooks/* Stripe からの通知。塞ぐと決済が確定しなくなる
 *   /legal /privacy /policy /company  公開ページ
 */

// 保護対象。ここに載せたパス配下だけ認証を要求する。
const PROTECTED = [
  "/kanri",
  "/fuhou",
  "/account",
  "/iei-photo", // AI遺影スタジオ（OpenAI課金が発生するため公開しない）
  "/funeral-script", // 司会台本・会葬礼状（同上）
  "/api/iei-photo",
  "/api/funeral-script",
];

function unauthorized(): NextResponse {
  return new NextResponse("認証が必要です", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Kawaguchi Tenrei", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

/** 長さの差で早期に判定しないよう全文字を走査する */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (!needsAuth) return NextResponse.next();

  // ローカル開発は素通し（毎回の入力を避ける）。本番は必ず認証する。
  if (process.env.NODE_ENV === "development") return NextResponse.next();

  const expectUser = process.env.ADMIN_BASIC_USER || "kawaguchi";
  const expectPass = process.env.ADMIN_BASIC_PASSWORD;
  // パスワード未設定のまま通してしまうと無防備になるため、その場合も拒否する。
  if (!expectPass) return unauthorized();

  const header = req.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("basic ")) return unauthorized();

  let decoded = "";
  try {
    decoded = atob(header.slice(6).trim());
  } catch {
    return unauthorized();
  }
  const i = decoded.indexOf(":");
  if (i < 0) return unauthorized();
  const user = decoded.slice(0, i);
  const pass = decoded.slice(i + 1);

  if (!safeEqual(user, expectUser) || !safeEqual(pass, expectPass)) {
    return unauthorized();
  }
  return NextResponse.next();
}

export const config = {
  // 静的アセットと画像最適化は対象外（認証しても意味がなく、表示が壊れるため）
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
