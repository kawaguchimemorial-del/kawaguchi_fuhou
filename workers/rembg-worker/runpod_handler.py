"""
RunPod Serverless ハンドラ（背景除去専用）

RunPod Serverless は、ジョブごとに `handler(job)` を呼び出す。
- 入力: job["input"] に base64 画像を受け取る
- 処理: rembg で背景除去（人物の生成・描き直しはしない）
- 出力: 透過PNG を base64 で返す

想定 input:
    { "image_base64": "...", "filename": "input.jpg" }   # filename は任意

想定 output:
    { "ok": true, "image_base64": "...", "mime_type": "image/png" }
    失敗時: { "ok": false, "message": "..." }

ローカル FastAPI モード（app.py）とはコアロジック（rembg_core）を共有する。
"""

import base64
import binascii

from rembg_core import remove_background_to_png_bytes


def handler(job):
    job_input = (job or {}).get("input") or {}

    image_b64 = job_input.get("image_base64")
    if not image_b64:
        return {"ok": False, "message": "image_base64 が指定されていません。"}

    # filename は任意（ログ等の用途）。処理には使わない。
    _filename = job_input.get("filename")

    try:
        data = base64.b64decode(image_b64, validate=True)
    except (binascii.Error, ValueError):
        return {"ok": False, "message": "image_base64 のデコードに失敗しました。"}

    try:
        png_bytes = remove_background_to_png_bytes(data)
    except Exception as error:  # noqa: BLE001 - 呼び出し側へ簡潔なメッセージのみ返す
        return {"ok": False, "message": f"背景除去に失敗しました: {error}"}

    return {
        "ok": True,
        "image_base64": base64.b64encode(png_bytes).decode("ascii"),
        "mime_type": "image/png",
    }


if __name__ == "__main__":
    # runpod は RunPod Serverless 実行時のみ必要。ローカルの構文チェック
    # （py_compile）では import しないため、ここで遅延 import する。
    try:
        import runpod
    except ImportError as error:  # pragma: no cover
        raise SystemExit(
            "runpod パッケージが見つかりません。`pip install runpod` を実行してください。"
        ) from error

    runpod.serverless.start({"handler": handler})
