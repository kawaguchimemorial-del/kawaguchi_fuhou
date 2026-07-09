/**
 * POST /api/iei-photo/export
 *
 * 各サイズ（基準写真・手札・四つ切り・16:9）の出力結果を返す。
 * MVP では実画像が無いため、すべて null を返す。
 * 実際の出力生成は将来 lib/iei-photo/mock-job.ts 経由で外部処理に差し替える。
 */

import type { IeiPhotoExportResponse } from "@/lib/iei-photo/types";
import { mockEmptyExports } from "@/lib/iei-photo/mock-job";

export async function POST(): Promise<Response> {
  const body: IeiPhotoExportResponse = {
    ok: true,
    exports: mockEmptyExports(),
  };

  return Response.json(body);
}
