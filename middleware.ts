import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * 管理系ルートの認証（Supabase Auth）。
 *
 * 経緯: もともと /account/sign-in が認証していないデモ実装だったため、
 * 2026-07-30 に応急処置として全社員共通のBasic認証を置いた。
 * 共通パスワードでは「誰が操作したか」が残らず、退職者の締め出しもできないため、
 * アカウント別の実ログインへ移行した（Basic認証は廃止）。
 *
 * ここでの判定は2つだけ。重い問い合わせはしない。
 *   1. 有効なセッションがあるか（supabase.auth.getUser で認証サーバーに確認）
 *   2. そのユーザーが管理画面の許可を持つか（app_metadata.admin）
 * 許可の正本は admin_users テーブルで、画面側は requireAdmin() が改めて参照する。
 * app_metadata はJWTに載る検証済みの値なので、ここでは追加のDB問い合わせ無しで門前払いできる。
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
  "/iei-photo", // AI遺影スタジオ（OpenAI課金が発生するため公開しない）
  "/funeral-script", // 司会台本・会葬礼状（同上）
  "/api/iei-photo",
  "/api/funeral-script",
];

// /account 配下はログイン画面自体を含むため、保護対象から外す。
// （ログインしていない人が入れないと、そもそもログインできない）
const SIGN_IN_PATH = "/account/sign-in";

function isProtected(pathname: string): boolean {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // レスポンスは常にこれを返す。Supabaseがトークンを更新した場合、
  // 更新後のCookieをここに載せてブラウザへ返す必要がある（載せ忘れるとログインが切れる）。
  let res = NextResponse.next({ request: req });

  // 公開ページ（訃報案内など）で毎回 Supabase に問い合わせると表示が遅くなるため、
  // 保護対象でなければ何もしない。トークンの更新は管理画面側の遷移で行われる。
  if (!isProtected(pathname)) return res;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // 設定が無い環境で素通しすると無防備になるため、保護対象は明示的に拒否する。
  if (!url || !key) {
    return new NextResponse("認証を設定できていません", { status: 503 });
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() は認証サーバーに問い合わせて検証する。ここを getSession() にすると
  // Cookieの中身を信じるだけになり、権限の判定には使えない。
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const allowed = Boolean(user) && user?.app_metadata?.admin === true;
  if (allowed) return res;

  // APIはリダイレクトしても意味がないので401。画面はログインへ送り、元のURLへ戻す。
  if (pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "認証が必要です" }), {
      status: 401,
      headers: { "content-type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const to = req.nextUrl.clone();
  to.pathname = SIGN_IN_PATH;
  to.search = "";
  to.searchParams.set("next", pathname + search);
  return NextResponse.redirect(to);
}

export const config = {
  // 静的アセットと画像最適化は対象外（認証しても意味がなく、表示が壊れるため）
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
