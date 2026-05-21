# 名片王 SaaS 藍圖

## 產品定位

名片王是一套給業務、顧問、門市、展會團隊使用的數位名片 SaaS。核心價值不是單純做漂亮頁面，而是讓每張名片都能更新、分享、追蹤、收集名單，並由公司統一管理品牌與成效。

## MVP 範圍

- 名片管理：新增、編輯、複製、刪除、版型切換。
- 公開頁：每張名片有唯一分享網址與 QR code。
- 名單收集：訪客可留下姓名、電話、Email、需求。
- 成效追蹤：瀏覽數、點擊數、名單數、轉換率。
- 團隊管理：公司底下可有多位成員與多張名片。
- 匯出：名片資料與名單可匯出成 JSON 或 CSV。

## 使用者架構

- admin：平台管理者，管理租戶、方案、系統設定、OCR 用量與全站資料。
- rent：租戶或企業帳號，管理自己的成員、名片模板、名片資料、檔案與名單。
- user：一般使用者，建立與維護自己的數位名片、上傳名片照片、查看自己的辨識結果。

## 建議資料模型

```text
accounts
- id
- name
- plan
- custom_domain
- created_at

users
- id
- account_id
- name
- email
- role
- created_at

rent_accounts
- id
- owner_user_id
- company_name
- plan
- status
- created_at

cards
- id
- account_id
- user_id
- slug
- theme
- name
- title
- company
- phone
- email
- social
- bio
- is_published
- created_at
- updated_at

card_ocr_jobs
- id
- account_id
- user_id
- source_object_key
- status
- raw_text
- parsed_json
- error_message
- created_at
- completed_at

files
- id
- account_id
- user_id
- provider
- bucket
- object_key
- category
- content_type
- size
- is_public
- created_at

leads
- id
- card_id
- name
- contact
- message
- source
- created_at

events
- id
- card_id
- event_type
- metadata
- created_at
```

## 技術路線

第一版部署到 Cloudflare Worker，但不使用 Cloudflare KV、D1、R2：

- Worker：發布後台前端、公開名片頁、API 外殼、OCR 任務入口。
- Static Assets：承載 `public/` 前端檔案，不使用 KV、D1、R2 binding。
- localStorage：目前 MVP 暫存名片與名單資料。
- Wasabi：後續若需要照片、頭像、Logo、附件與匯出檔案，改由後端安全串接。
- OpenAI GPT API：OCR / 視覺辨識，將拍照名片轉成結構化欄位。
- Pages 或 Worker Static Assets：後台前端。
- GitHub Actions：自動部署。

OpenAI API Key 與 Wasabi Secret Access Key 只能放在後端環境變數或 Secret Store，不得放在前端 JavaScript、HTML、公開 GitHub 或可下載設定檔。

## API 草案

```text
GET    /api/cards
POST   /api/cards
GET    /api/cards/:id
PUT    /api/cards/:id
DELETE /api/cards/:id

POST   /api/ocr/business-card
GET    /api/ocr/jobs/:id
POST   /api/files/presign-upload
GET    /api/files
GET    /api/files/:id/signed-url
DELETE /api/files/:id

GET    /card/:slug
POST   /api/public/cards/:slug/leads
POST   /api/public/cards/:slug/events

GET    /api/leads
GET    /api/analytics/summary
GET    /api/settings/account
PUT    /api/settings/account
```

## 下一步優先順序

1. 把目前純前端原型拆成後台與公開名片頁。
2. 建立 Worker API 外殼，不綁 KV、D1、R2。
3. 需要檔案保存時，建立 Wasabi 後端簽名上傳、列表、下載與刪除 API。
4. 實作拍照上傳、GPT OCR、欄位確認後寫入名片資料庫。
5. 實作真實 CRUD 與公開 `/card/:slug`。
6. 加入 QR code、表單收單與事件追蹤。
7. 加入登入與 admin/rent/user 權限。
8. 再接付款、方案限制與自訂網域。
