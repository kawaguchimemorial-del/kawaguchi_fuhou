import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// 見積書/請求書の手書きサイン保存API(8専門家仕様)。
// - target/roleはホワイトリストで列名決定(文字列連結禁止)
// - imageは data:image/png;base64 完全一致 + サイズ上限 + PNGシグネチャ検証(stored XSS遮断)
// - signed_at はサーバ時刻。image:null で削除。
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export async function POST(req: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, error: "db not configured" }, { status: 500 });
  }
  let body: { target?: string; id?: string; role?: string; image?: string | null };
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "invalid json" }, { status: 400 }); }
  const table = body.target === "invoice" ? "fk_invoices" : body.target === "estimate" ? "fk_estimates" : null;
  const col = body.role === "owner" ? "owner_sign" : body.role === "mourner" ? "mourner_sign" : null;
  if (!table || !col) return Response.json({ ok: false, error: "invalid target/role" }, { status: 400 });
  const id = body.id ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ ok: false, error: "invalid id" }, { status: 400 });
  }
  const image = body.image ?? null;
  if (image !== null) {
    if (typeof image !== "string" || image.length > 200_000) return Response.json({ ok: false, error: "image too large" }, { status: 400 });
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image)) return Response.json({ ok: false, error: "png data url required" }, { status: 400 });
    const buf = Buffer.from(image.slice("data:image/png;base64,".length), "base64");
    if (buf.length < 8 || !PNG_SIG.every((b, i) => buf[i] === b)) return Response.json({ ok: false, error: "not a png" }, { status: 400 });
  }
  const signedAt = image ? new Date().toISOString() : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = createAdminClient() as unknown as { from: (t: string) => any };
  const { error } = await c.from(table).update({ [col]: image, [`${col}ed_at`]: signedAt }).eq("id", id);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, signedAt });
}
