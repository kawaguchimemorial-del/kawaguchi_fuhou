# 自前 rembg ワーカー（背景切り抜き専用）
# 将来 RunPod / VPS / Railway / Render / Fly.io 等に載せられる最小構成。
FROM python:3.11-slim

WORKDIR /app

# Pillow / onnxruntime(rembg[cpu]) が必要とする最小限のシステムライブラリ。
# libgomp1 は onnxruntime(OpenMP) の実行に必要。
RUN apt-get update \
  && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# 本番では REMBG_WORKER_TOKEN を環境変数で設定すること。
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
