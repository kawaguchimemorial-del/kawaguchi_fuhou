# rembg worker（背景切り抜き専用）

AI遺影写真生成アプリ `/iei-photo` の背景切り抜きを担う、自前ワーカーの雛形です。
**背景除去のみ**を行い、人物の生成・描き直しはしません。アップロード画像から
人物領域を透過PNG化して返します。背景合成はブラウザ側 Canvas で行います。

アプリ（ブラウザ）からは直接このワーカーを叩かず、必ず Next.js の
`/api/iei-photo/remove-background` を経由します（ワーカーURL/トークン/APIキーを隠すため）。

## 2つの動作モード
このワーカーは同じコア（`rembg_core.py`）を使い、2通りで動かせます。

1. **ローカル検証用 FastAPI モード**（`app.py`）
   - `POST /remove-background` に `multipart/form-data` の `file` を送ると `image/png` を返す。
   - `Dockerfile`（FastAPI 用）/ `uvicorn` で起動。
2. **RunPod Serverless モード**（`runpod_handler.py`）
   - RunPod がジョブごとに `handler(job)` を呼ぶ。`job["input"]` に **base64 画像**を受け取り、
     **base64 の透過PNG**を返す。
   - `Dockerfile.runpod` でビルドし、RunPod Serverless Endpoint として起動。

どちらも「背景除去（透過PNG化）のみ」で、人物の生成・描き直しはしません。

## エンドポイント

### `POST /remove-background`
- 入力: `multipart/form-data` の `file`（画像）
- 認証: 任意。`REMBG_WORKER_TOKEN` を設定した場合は `Authorization: Bearer <token>` が必要
- 成功: `image/png`（透過PNG）を返す
- 失敗: JSON `{ "ok": false, "message": "..." }`

### `GET /health`
- 稼働確認用。`{ "ok": true, "auth_required": <bool> }`

## 依存（推論バックエンド）
- `requirements.txt` には **CPU 推論バックエンド（`rembg[cpu]` = onnxruntime）** を含めています。
  これが無いと初回推論時に `No onnxruntime backend found` で失敗します。GPU 依存は入れていません（CPU worker 前提）。
- **初回推論時に u2net などのモデル（約170MB）を自動ダウンロード**するため、最初の1回だけ時間がかかります
  （以降はキャッシュされます。モデルキャッシュはコミットしません）。

## 環境変数
- `REMBG_WORKER_TOKEN`（任意）: 設定すると Bearer トークン認証を有効化。
  - 未設定ならローカル開発用として**認証なし**で動作します。
  - **本番では必ず設定してください。**

## ローカル起動（FastAPI モード）

```bash
cd workers/rembg-worker
python -m venv .venv
# Windows: .venv\Scripts\activate  /  macOS・Linux: source .venv/bin/activate
pip install -r requirements.txt

# 認証なし（ローカル開発）
uvicorn app:app --host 0.0.0.0 --port 8000

# 認証あり（推奨）
# Windows(PowerShell): $env:REMBG_WORKER_TOKEN="任意のトークン"; uvicorn app:app --port 8000
# macOS/Linux:        REMBG_WORKER_TOKEN=任意のトークン uvicorn app:app --port 8000
```

初回は rembg のモデル（u2net 等, 約170MB）が自動ダウンロードされるため、最初の1回だけ時間がかかります。

動作確認（ローカルでは `localhost` より `127.0.0.1` を推奨）:

```bash
curl -f -X POST http://127.0.0.1:8000/remove-background \
  -F "file=@sample.jpg" \
  -o cutout.png
```

## Docker 起動（FastAPI モード）

```bash
cd workers/rembg-worker
docker build -t iei-rembg-worker .

# 認証なし
docker run --rm -p 8000:8000 iei-rembg-worker

# 認証あり
docker run --rm -p 8000:8000 -e REMBG_WORKER_TOKEN=任意のトークン iei-rembg-worker
```

## Next.js 側との接続

`.env.local`（コミットしない）に以下を設定します。

```env
# ローカルでは localhost より 127.0.0.1 を推奨（環境によっては Node が IPv6(::1) を
# 先に解決し、IPv4 待受のワーカーに繋がらず接続エラーになることがあるため）。
REMBG_WORKER_URL=http://127.0.0.1:8000
REMBG_WORKER_TOKEN=任意のトークン   # ワーカー側と一致させる。未設定なら空でも可（ローカルのみ）
```

ブラウザ → `/api/iei-photo/remove-background` → このワーカー `/remove-background` → 透過PNG
→ ブラウザ Canvas で背景設定と合成、という流れです。

### よくあるハマりどころ
- **`localhost` で繋がらない場合は `127.0.0.1` を使う**（上記の IPv6 解決問題）。
  または、ワーカーを全インターフェースで起動する（`uvicorn app:app --host 0.0.0.0 --port 8000`）。
- **古い Next dev サーバが残っていると、新しい API ルート（`/api/iei-photo/remove-background`）が
  404 になる**ことがあります。その場合は古い dev サーバを停止してから `npm run dev` で起動し直してください
  （Next は同一ディレクトリで複数 dev サーバを同時起動できません）。

## RunPod Serverless モード

RunPod Serverless に載せる場合は `Dockerfile.runpod`（handler 起動）を使います。
`runpod_handler.py` が `job["input"].image_base64` を受け取り、透過PNGを base64 で返します。

### 1. イメージをビルド
```bash
cd workers/rembg-worker
docker build -f Dockerfile.runpod -t <dockerhub-user>/iei-rembg-runpod:latest .
```
（初回はモデル u2net をビルド時に事前取得します。CPU前提です。）

### 2. レジストリへ push（Docker Hub 等）
```bash
docker login
docker push <dockerhub-user>/iei-rembg-runpod:latest
```

### 3. RunPod Serverless Endpoint を作成
1. RunPod ダッシュボード → Serverless → New Endpoint。
2. Container Image に `<dockerhub-user>/iei-rembg-runpod:latest` を指定。
3. CPU ワーカーで作成（GPU は不要）。
4. 作成後に表示される **Endpoint ID / URL** と **API Key** を控える。
   - 同期実行URLの例: `https://api.runpod.ai/v2/<endpoint-id>/runsync`

### 4. Next.js 側に設定（`.env.local`、コミットしない）
```env
# RunPod を使う場合（REMBG_WORKER_URL は未設定にする）
RUNPOD_ENDPOINT_URL=https://api.runpod.ai/v2/<endpoint-id>/runsync
RUNPOD_API_KEY=<runpod-api-key>
```
- ブラウザ → `/api/iei-photo/remove-background` → （サーバー側で）RunPod を呼ぶ、という流れ。
- **APIキーはサーバー側のみで使用し、クライアントには露出しません。**
- Next.js Route Handler 側の RunPod 接続は **実装済み**（file→base64→`{input:{image_base64,filename}}`→`output.image_base64`→PNG）。

### worker の優先順位（Next.js）
1. `REMBG_WORKER_URL` があれば **self-hosted HTTP worker** を使用（優先）。
2. 無く `RUNPOD_ENDPOINT_URL` ＋ `RUNPOD_API_KEY` があれば **RunPod Serverless** を使用。
3. どちらも無ければ設定不足エラー。

### Vercel での設定
本番/プレビューで背景切り抜きを使うには、Vercel のプロジェクト環境変数に
`RUNPOD_ENDPOINT_URL` と `RUNPOD_API_KEY`（または自前 worker の `REMBG_WORKER_URL`／必要なら `REMBG_WORKER_TOKEN`）
を設定する必要があります。未設定だと UI に設定不足エラーが表示されます。

## GHCR へビルド/Push（GitHub Actions・ローカル Docker 不要）
ローカルに Docker が無くても、GitHub Actions 上で `Dockerfile.runpod` をビルドして
GitHub Container Registry（GHCR）へ push できます。

1. GitHub の **Actions タブ → 「Build rembg worker image」→ Run workflow** で手動実行。
2. 成功すると **Packages** に GHCR イメージが作られます：
   - `ghcr.io/<owner>/<repo>/iei-rembg-worker:latest`
   - `ghcr.io/<owner>/<repo>/iei-rembg-worker:sha-<commit>`
3. RunPod Serverless Endpoint の **Worker Image** に、その GHCR イメージを指定します。
4. Package が **Private** の場合、RunPod が pull できるよう権限設定（pull 用トークン等）が必要なことがあります。
5. うまくいかない場合は、一時的に **Package の visibility を Public** にする選択肢もあります
   （機微情報を含まないイメージである前提で）。

## 環境変数（Next.js 側）
| 変数 | 用途 |
| --- | --- |
| `REMBG_WORKER_URL` | 自前 FastAPI worker のURL（例 `http://127.0.0.1:8000`）。設定時はこちらを優先。 |
| `REMBG_WORKER_TOKEN` | FastAPI worker の Bearer トークン（任意）。worker 側と一致させる。 |
| `RUNPOD_ENDPOINT_URL` | RunPod Serverless Endpoint URL（将来）。 |
| `RUNPOD_API_KEY` | RunPod APIキー（将来）。サーバー側のみ・クライアント非露出。 |

いずれも `.env.local`（コミットしない）に記載。`.env.local.example` を参照。

## 注意点
- **人物生成は行いません。** 背景除去（人物マスク作成・透過PNG化）のみです。
- 顔・肌・髪・服・シワ・ほくろ・眼鏡などを描き直すことはありません。
- **本番では認証トークン（`REMBG_WORKER_TOKEN` / `RUNPOD_API_KEY`）を必ず設定してください。**
- **初回推論時に u2net 等のモデル（約170MB）を自動ダウンロード**するため、最初の1回だけ時間がかかります。
- **CPU 実行では推論が遅い場合があります。** 大きすぎる画像は時間がかかる/失敗することがあるため、必要に応じて縮小してください。
- RunPod 接続の Next.js 実装は完了。RunPod 本番 Endpoint の作成・Vercel への環境変数設定は別途必要。
