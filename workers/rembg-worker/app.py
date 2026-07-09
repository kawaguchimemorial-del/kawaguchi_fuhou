"""
自前 rembg ワーカー（背景切り抜き専用）

役割:
- アップロード画像から「人物領域を透過PNG化（背景除去）」するだけ。
- 人物の顔・肌・髪・服・シワ・ほくろ・眼鏡などを生成・描き直しはしない。
- 背景合成はブラウザ側 Canvas で行うため、ここは透過PNGを返すのみ。

セキュリティ:
- REMBG_WORKER_TOKEN を設定すると Authorization: Bearer <token> を要求する。
- 未設定ならローカル開発用として認証なしで動く（本番では必ず設定すること）。
"""

import os

from fastapi import FastAPI, File, Header, UploadFile
from fastapi.responses import JSONResponse, Response

from rembg_core import remove_background_to_png_bytes

app = FastAPI(title="iei-photo rembg worker", version="0.1.0")

# 本番では必ず設定する。未設定はローカル開発専用の挙動。
EXPECTED_TOKEN = os.environ.get("REMBG_WORKER_TOKEN")


def _is_authorized(authorization: "str | None") -> bool:
    # token 未設定ならローカル開発用として認証なしで許可する。
    if not EXPECTED_TOKEN:
        return True
    return authorization == f"Bearer {EXPECTED_TOKEN}"


@app.get("/health")
def health():
    return {"ok": True, "auth_required": bool(EXPECTED_TOKEN)}


@app.post("/remove-background")
async def remove_background(
    file: UploadFile = File(...),
    authorization: "str | None" = Header(default=None),
):
    if not _is_authorized(authorization):
        return JSONResponse(
            status_code=401,
            content={"ok": False, "message": "認証に失敗しました。"},
        )

    try:
        data = await file.read()
        if not data:
            return JSONResponse(
                status_code=400,
                content={"ok": False, "message": "画像ファイルが空です。"},
            )

        # 背景除去のみ（人物の生成・描き直しは行わない）。
        png_bytes = remove_background_to_png_bytes(data)
        return Response(content=png_bytes, media_type="image/png")
    except Exception as error:  # noqa: BLE001 - クライアントには簡潔なメッセージのみ返す
        return JSONResponse(
            status_code=500,
            content={"ok": False, "message": f"背景除去に失敗しました: {error}"},
        )
