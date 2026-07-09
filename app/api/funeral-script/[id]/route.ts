import { getFuneralScriptContent } from "@/lib/kanri/funeral-scripts";
import { sectionsToPlainText } from "@/lib/funeral-script/format";
import { originalLetterToPrintText } from "@/lib/funeral-script/original-letter";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// 保存済み台本の取得。
// - 既定: 保存ファイルJSON(再編集用)。
// - ?format=txt: 台本+礼状の全文テキスト(一覧のダウンロード用)。
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const rec = await getFuneralScriptContent(id);
  if (!rec) {
    return Response.json({ ok: false, error: "台本が見つかりません。" }, { status: 404 });
  }
  const content = rec.content;

  const url = new URL(req.url);
  if (url.searchParams.get("format") === "txt") {
    const form = content.form;
    const blocks = [
      sectionsToPlainText(content.sections, {
        ceremonyType: form.ceremonyType,
        deceasedName: form.deceasedName,
      }),
    ];
    if (content.originalLetter) {
      blocks.push(originalLetterToPrintText(form, content.originalLetter));
    }
    const text = blocks.join("\n\n────────────────\n\n");
    const name = (form.deceasedName || "台本").trim().replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 24);
    return new Response(text, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`葬儀司会台本_${name}.txt`)}`,
      },
    });
  }

  return Response.json({
    ok: true,
    content,
    customerId: rec.customerId,
    estimateId: rec.estimateId,
  });
}
