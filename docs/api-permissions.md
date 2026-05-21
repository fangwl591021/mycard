# 名片王 API 與權限表

此階段只做 Worker API 骨架與 Wasabi JSON 路徑，不使用 KV、D1、R2。

## 身份

所有私人 API 都必須帶 LIFF idToken：

```text
Authorization: Bearer {LINE_LIFF_ID_TOKEN}
```

Worker 使用 LINE verify API 取得 `line_user_id`，再轉成內部：

```text
user_id = line_{line_user_id}
```

前端不能自行指定 `user_id`，也不能自行指定完整 Wasabi Object Key。

## 路由

| API | 權限 | Wasabi 路徑 | 說明 |
|---|---|---|---|
| `GET /api/health` | 公開 | 無 | 健康檢查 |
| `GET /api/config` | 公開 | 無 | LIFF 與方案設定 |
| `GET /r/{ref_code}` | 公開 | 無 | 寫入推薦來源 cookie 後導向 LIFF |
| `POST /api/auth/line` | LIFF user | `users/{user_id}/profile.json` | 建立或更新 user profile |
| `GET /api/me` | LIFF user | `users/{user_id}/profile.json`、`users/{user_id}/points/balance.json` | 讀取自己的資料 |
| `GET /api/cards` | LIFF user | `users/{user_id}/indexes/cards.json`、`users/{user_id}/cards/{card_id}.json` | 讀取自己的名片清單 |
| `POST /api/cards` | LIFF user | `users/{user_id}/cards/{card_id}.json` | 手動建立私人名片 |
| `PUT /api/cards/{card_id}` | LIFF user | `users/{user_id}/cards/{card_id}.json` | 更新自己的私人名片 |
| `DELETE /api/cards/{card_id}` | LIFF user | `users/{user_id}/cards/{card_id}.json` | 刪除自己的名片與公開索引 |
| `POST /api/cards/{card_id}/publish` | LIFF user | `public/cards/{slug}.json` | 發布或取消發布公開名片 |
| `GET /card/{slug}` | 公開 | `public/cards/{slug}.json` | 公開名片頁 |
| `POST /api/cards/scan` | LIFF user | `users/{user_id}/...` | 上傳名片圖、GPT OCR、查重、建立卡片、送 10 點 |
| `GET /api/rents` | LIFF user | `users/{user_id}/indexes/rents.json`、`rents/{rent_id}/profile.json` | 讀取自己的付費空間 |
| `POST /api/rents` | LIFF user | `rents/{rent_id}/...`、`users/{user_id}/indexes/rents.json` | 建立付費空間草稿，狀態為 `pending_payment` |

## 掃描名片流程

```text
1. 使用者用 LIFF 登入。
2. 前端送出 multipart/form-data，欄位 `image` 是名片照片。
3. Worker 驗證 LIFF idToken。
4. Worker 先用圖片呼叫 GPT OCR。
5. Worker 產生 fingerprint。
6. Worker 只查自己的 index：
   users/{user_id}/indexes/card-fingerprints.json
7. 重複：不保存圖片、不建立 card、不送點。
8. 不重複：才將圖片寫入 Wasabi：
   users/{user_id}/images/business-cards/{yyyy}/{mm}/{image_id}.jpg
9. 建立 OCR job 與 card JSON、更新 cards index 與 fingerprint index、寫 points ledger、更新 balance。
```

## 重複判斷

重複判斷只針對自己的名片庫：

```text
users/{user_id}/indexes/card-fingerprints.json
```

不同 user 掃到同一張紙本名片，可以各自建立、各自取得 10 點。

## 點數

成功建立非重複名片才送 10 點：

```text
users/{user_id}/points/ledger/{yyyy}/{mm}/{event_id}.json
users/{user_id}/points/balance.json
```

上傳圖片本身不送點。OCR 失敗、欄位不足、重複名片都不送點，也不保存成正式名片資料。

## 公開名片

私人名片預設只存在自己的路徑：

```text
users/{user_id}/cards/{card_id}.json
```

只有呼叫 `POST /api/cards/{card_id}/publish` 後，Worker 才會另外寫入公開副本：

```text
public/cards/{slug}.json
```

公開頁只讀 `public/cards/{slug}.json`，不讀 `users/{user_id}/...`，避免公開頁誤碰私人資料。

## 推廣歸屬

每個 user 登入後會取得自己的 `ref_code` 與 `referral_url`：

```text
https://myvard.fangwl591021.workers.dev/r/{ref_code}
```

訪客打開 `/r/{ref_code}` 時，Worker 會寫入 `mycard_ref` cookie，然後導向 LIFF。新 user 第一次登入時才綁定推薦來源：

```text
users/{user_id}/profile.json
referrals/codes/{ref_code}.json
```

歸屬規則：

- 推廣碼永遠屬於 user，不屬於 rent。
- 自己推薦自己無效。
- 已經有 `referred_by_user_id` 的 user 不會被新連結覆蓋。
- 註冊只記歸屬，付費 conversion 之後再獨立建立。

## 付費空間 rent

`rent` 是付費空間，可以是個人 PRO，也可以是 enterprise 組織。建立 rent 草稿不代表付款完成：

```text
rents/{rent_id}/profile.json
rents/{rent_id}/members/{user_id}.json
rents/{rent_id}/indexes/cards.json
users/{user_id}/indexes/rents.json
```

目前 `POST /api/rents` 只建立：

```text
status = pending_payment
```

後續串接金流後，付款成功才可改成：

```text
status = active
```

## Worker 變數

```text
LIFF_ID
LIFF_URL
OPENAI_API_KEY
WASABI_ACCESS_KEY_ID
WASABI_SECRET_ACCESS_KEY
WASABI_BUCKET
WASABI_ENDPOINT
WASABI_REGION
```

`OPENAI_API_KEY`、`WASABI_ACCESS_KEY_ID`、`WASABI_SECRET_ACCESS_KEY` 必須是 Secret，不可進前端或 GitHub。
