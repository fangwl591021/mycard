# 名片王 Wasabi 與 OCR 架構

## 重要安全判斷

Wasabi Access Key 與 Secret Access Key 已屬於高敏感憑證。這類憑證只能放在後端環境變數或 Secret Store，不能放在前端、HTML、公開 GitHub、APP 可反編譯位置或可下載設定檔。

如果憑證曾經出現在聊天、截圖、文件或任何可多人存取的位置，應視為已暴露，建議立刻在 Wasabi 後台停用並重產 Sub-User Key。

## 使用者架構

```text
admin
- 平台最高管理者
- 管理租戶、方案、用量、系統設定、金鑰設定
- 可查看跨租戶統計，但正式產品應限制直接讀取租戶個資

rent
- 租戶 / 公司 / 店家帳號
- 管理自己的團隊、名片、模板、名單、檔案與報表
- Wasabi Object Key 應鎖在自己的租戶 Prefix

user
- 租戶底下的一般成員
- 管理自己的名片
- 可拍照上傳名片並使用 OCR 建立或更新資料
```

## OCR 流程

```text
前端拍照或選圖
  -> 後端檢查登入與權限
  -> 後端產生 Wasabi presigned upload URL
  -> 前端把圖片上傳到 Wasabi 指定 Prefix
  -> 前端通知後端建立 OCR job
  -> 後端讀取圖片或短效 URL
  -> 呼叫 GPT API 做 OCR 與欄位解析
  -> 寫入 card_ocr_jobs
  -> 使用者確認欄位
  -> 寫入 cards 資料表
```

建議不要讓 GPT OCR 結果直接覆蓋正式名片。先存成 `card_ocr_jobs.parsed_json`，讓使用者確認後再建立或更新 `cards`。

## Wasabi Object Key 規則

所有檔案放在同一個 Bucket，但使用 Prefix 分租戶與類別。

```text
tonyuse/shops/{rent_id}/{category}/{yyyy}/{mm}/{filename}
```

如果 `tonyuse` 是 Bucket 名稱，Object Key 不要再重複放 `tonyuse/`：

```text
shops/{rent_id}/{category}/{yyyy}/{mm}/{filename}
```

建議名片王先採用：

```text
shops/{rent_id}/business-cards/{yyyy}/{mm}/card-photo-{user_id}-{timestamp}-{random}.{ext}
shops/{rent_id}/avatars/{yyyy}/{mm}/avatar-{user_id}-{timestamp}-{random}.{ext}
shops/{rent_id}/logos/{yyyy}/{mm}/logo-{timestamp}-{random}.{ext}
shops/{rent_id}/exports/{yyyy}/{mm}/cards-{timestamp}-{random}.csv
```

## Wasabi 後端 API

```text
POST   /api/files/presign-upload
GET    /api/files
GET    /api/files/:id/signed-url
DELETE /api/files/:id
POST   /api/ocr/business-card
GET    /api/ocr/jobs/:id
POST   /api/ocr/jobs/:id/apply
```

## 建議資料表

```text
rent_accounts
- id
- name
- status
- plan
- created_at

users
- id
- rent_id
- role              -- admin, rent, user
- name
- email
- created_at

cards
- id
- rent_id
- user_id
- slug
- name
- title
- company
- phone
- email
- line_id
- website
- address
- bio
- avatar_file_id
- source_ocr_job_id
- created_at
- updated_at

files
- id
- rent_id
- user_id
- provider          -- wasabi
- bucket
- object_key
- category
- content_type
- size
- checksum
- is_public
- created_at

card_ocr_jobs
- id
- rent_id
- user_id
- source_file_id
- status            -- queued, processing, needs_review, applied, failed
- raw_text
- parsed_json
- error_message
- created_at
- completed_at
```

## GPT OCR 輸出格式

後端呼叫 GPT API 時，要求模型回傳固定 JSON，不讓前端自行解析自然語言。

```json
{
  "name": "",
  "title": "",
  "company": "",
  "phone": "",
  "email": "",
  "line_id": "",
  "website": "",
  "address": "",
  "confidence": {
    "name": 0,
    "phone": 0,
    "email": 0
  },
  "raw_text": ""
}
```

## 權限規則

- admin 可以管理所有 rent，但仍應記錄操作 log。
- rent 只能管理自己租戶底下的 user、cards、files、leads。
- user 只能管理自己的 cards 與 OCR jobs。
- Wasabi 操作必須由後端代簽，前端永遠不接觸 Secret Key。
- DeleteObject 建議只開給 admin/rent，user 刪除可先做軟刪除。

## 第一階段開發任務

1. 建立 Worker + Static Assets 專案骨架，不綁 KV、D1、R2。
2. 前端先用 `localStorage` 保存名片與 OCR 確認結果。
3. 建立拍照上傳 UI。
4. 後續若要保存原始圖片，建立 Wasabi S3 client，憑證放在 Worker secrets。
5. 實作 GPT OCR job。
6. 實作 OCR 結果確認畫面。
7. 確認後寫入目前資料來源；MVP 為 `localStorage`，正式版再接外部資料庫或後端資料服務。
