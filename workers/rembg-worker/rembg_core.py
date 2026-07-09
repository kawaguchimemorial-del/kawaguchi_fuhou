"""
背景除去のコアロジック（FastAPI モードと RunPod Serverless モードで共有）

- 背景除去（人物マスク作成・透過PNG化）のみ。
- 人物の顔・肌・髪・服・シワ・ほくろ・眼鏡などの生成・描き直しは行わない。
- 初回呼び出し時に rembg のモデル（u2net 等）が自動ダウンロードされる。
"""

from io import BytesIO

from PIL import Image
from rembg import remove


def remove_background_to_png_bytes(data: bytes) -> bytes:
    """画像バイト列を受け取り、背景除去した透過PNGのバイト列を返す。

    Args:
        data: 入力画像のバイト列（JPEG/PNG 等）。
    Returns:
        透過PNG（RGBA）のバイト列。
    Raises:
        ValueError: 入力が空のとき。
        その他: 画像デコード/推論失敗時は例外を送出（呼び出し側で整形する）。
    """
    if not data:
        raise ValueError("画像データが空です。")

    input_image = Image.open(BytesIO(data)).convert("RGBA")
    output_image = remove(input_image)  # 透過PNG（人物領域のみ残る）

    buffer = BytesIO()
    output_image.save(buffer, format="PNG")
    return buffer.getvalue()
