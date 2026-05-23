# 名片王內容倉庫規劃

## 定位

名片王後續定位為「內容倉庫與共用工具能力中台」，不是只服務單一名片後台。

各專案需要圖文選單、LINE VOOM 影片擷取、電子名片模板、Flex JSON 產生器或素材管理時，應透過名片王提供的 API 或 SDK 取得能力，避免每個專案都重複搬整套程式，造成專案越來越大、維護越來越重。

## 資料庫與儲存來源

資料庫採用 Wasabi S3 相容物件儲存，依據文件：

`D:\服務客戶\LINE商機引擎\外站直接串接Wasabi空間讀寫API文件.docx`

正式規則：

- Provider: Wasabi
- Bucket: `tonyuse`
- Region: `us-west-1`
- Endpoint: `https://s3.us-west-1.wasabisys.com`
- Secret Key、Access Key 只能放在 Worker 環境變數或 Secret，不得放在前端、HTML、GitHub 或可下載設定檔
- 本專案不使用 KV、D1、R2 作為主要資料庫
- 前端不得直接呼叫 Wasabi，所有讀寫都必須經由 Worker 後端

Worker 需要的環境變數：

```text
WASABI_ACCESS_KEY_ID
WASABI_SECRET_ACCESS_KEY
WASABI_BUCKET
WASABI_REGION
WASABI_ENDPOINT
OPENAI_API_KEY
LIFF_ID
LIFF_URL
```

## Wasabi Object Key 規格

內容倉庫統一放在 `tonyuse/` 底下的分類資料夾。

建議 Object Key：

```text
tonyuse/content-hub/modules/{module}/templates/{template_id}.json
tonyuse/content-hub/modules/{module}/items/{item_id}.json
tonyuse/content-hub/modules/{module}/indexes/{index_name}.json
tonyuse/content-hub/assets/images/{yyyy}/{mm}/{filename}
tonyuse/content-hub/assets/videos/{yyyy}/{mm}/{filename}
tonyuse/content-hub/sdk/releases/{version}/mycard-hub.js
tonyuse/content-hub/audit/{yyyy}/{mm}/{event_id}.json
```

若程式內的 Bucket 已是 `tonyuse`，Object Key 可視 Wasabi 實作決定是否省略第一層 `tonyuse/`。實作前必須以實際 Bucket 目錄確認一次，避免路徑多包一層。

## 第一階段模組

### 1. 電子名片模板庫

來源參考：

- `fangwl591021/mylittlesys`
- 其中的 V1 / V2 / V3 / V4 Flex 名片與模板產生邏輯
- 目前名片王已搬入的舊系統名片欄位

搬移重點：

- 搬「模板資料格式」
- 搬「Flex JSON 產生器」
- 搬「欄位轉換器」
- 搬「預覽資料結構」
- 不整包搬舊 UI

資料格式：

```text
content-hub/modules/ecard/templates/{template_id}.json
content-hub/modules/ecard/indexes/templates.json
```

API 草案：

```text
GET  /api/hub/templates?type=ecard
GET  /api/hub/templates/{template_id}
POST /api/hub/ecard/render
POST /api/hub/ecard/flex
POST /api/hub/ecard/save-variant
```

SDK 草案：

```js
const hub = createMyCardHub({ apiBase, token });

await hub.ecard.listTemplates();
await hub.ecard.getTemplate("v2-business-card");
await hub.ecard.render("v2-business-card", cardData);
await hub.ecard.generateFlex("v2-business-card", cardData);
```

### 2. 圖文選單工具

來源參考：

- `mylittlesys` 的圖文選單編輯器
- rich menu size / area / action / chatBarText / publish 流程

搬移重點：

- 圖文選單 JSON schema
- 座標區塊驗證
- LINE action 正規化
- 圖片與選單資料分離
- 發布到 LINE 的 Worker 後端能力

資料格式：

```text
content-hub/modules/rich-menu/templates/{template_id}.json
content-hub/modules/rich-menu/items/{menu_id}.json
content-hub/modules/rich-menu/indexes/templates.json
```

API 草案：

```text
GET  /api/hub/richmenus/templates
GET  /api/hub/richmenus/{menu_id}
POST /api/hub/richmenus/validate
POST /api/hub/richmenus/render
POST /api/hub/richmenus/publish
```

SDK 草案：

```js
await hub.richMenu.listTemplates();
await hub.richMenu.validate(menuConfig);
await hub.richMenu.build(menuConfig);
await hub.richMenu.publish(channelConfig, menuConfig);
```

### 3. LINE VOOM 影片擷取器

來源參考：

- `mylittlesys` 的 LINE VOOM 貼文抓取工具

搬移重點：

- VOOM URL 解析
- 影片網址、縮圖、圖片清單擷取
- 結果快取到 Wasabi JSON
- 不讓每個專案自己處理 CORS 或 LINE 頁面結構變動

資料格式：

```text
content-hub/modules/voom/items/{job_id}.json
content-hub/modules/voom/indexes/recent.json
```

API 草案：

```text
POST /api/hub/voom/extract
GET  /api/hub/voom/jobs/{job_id}
```

SDK 草案：

```js
await hub.voom.extract("https://linevoom.line.me/post/...");
await hub.voom.getJob(jobId);
```

## 共用 API 設計

所有內容倉庫能力統一走 `/api/hub/*`。

```text
GET  /api/hub/modules
GET  /api/hub/templates
GET  /api/hub/templates/{template_id}
POST /api/hub/templates
DELETE /api/hub/templates/{template_id}
POST /api/hub/seed
POST /api/hub/assets/upload
GET  /api/hub/assets/{asset_id}/signed-url
GET  /api/hub/assets/{asset_id}
POST /api/hub/render/flex
GET  /sdk/mycard-hub.js
```

寫入型 API 必須使用後端或管理端呼叫，並帶入：

```text
x-hub-admin-token: {HUB_ADMIN_TOKEN}
```

公開專案只能使用讀取、render 與 SDK 呼叫，不得持有 Wasabi Secret，也不得持有 hub admin token。

回應格式固定：

```json
{
  "success": true,
  "code": "ok",
  "data": {}
}
```

錯誤格式固定：

```json
{
  "success": false,
  "code": "error_code",
  "message": "可讀的錯誤訊息"
}
```

## SDK 設計方向

SDK 應保持輕量，只做呼叫 API、整理資料與產生常用 helper，不把整個後台 UI 打包進去。

```js
import { createMyCardHub } from "https://myvard.fangwl591021.workers.dev/sdk/mycard-hub.js";

const hub = createMyCardHub({
  apiBase: "https://myvard.fangwl591021.workers.dev",
  token: userToken
});

const templates = await hub.ecard.listTemplates();
const flex = await hub.ecard.generateFlex("v2-business-card", cardData);
const voom = await hub.voom.extract(voomUrl);
```

## 權限邊界

### admin

- 管理全部模組
- 新增、修改、刪除共用模板
- 管理 SDK 版本
- 管理 LINE Channel 設定
- 檢視稽核紀錄

### rent

- 使用共用模板
- 建立自己的圖文選單、名片模板變體
- 可發布到自己的 LINE Channel
- 不能修改全域共用模板

### user

- 使用授權範圍內的模板
- 建立自己的名片資料
- 看不到其他 user 的資料

## 從 mylittlesys 搬移原則

搬：

- 模板資料結構
- Flex JSON builder
- Rich Menu schema
- Rich Menu 發布流程
- VOOM 擷取邏輯
- 圖片/素材處理概念

不搬：

- 舊專案整包 UI
- 舊登入與 demo 帳號邏輯
- 舊專案專用命名
- 造成權限混亂的資料共用方式
- 與內容倉庫無關的頁面

## 實作階段

### Phase 1: 盤點與標準化

- 讀取 `mylittlesys` 的模板與工具程式
- 列出 V1 / V2 / V3 / V4 的欄位差異
- 定義電子名片模板 JSON schema
- 定義 Rich Menu JSON schema
- 定義 VOOM 擷取結果 schema

### Phase 2: Wasabi Repository

- 建立通用 Wasabi JSON 讀寫層
- 建立 index 更新方式
- 建立 assets 上傳與 signed URL
- 建立 audit log

### Phase 3: API

- 建立 `/api/hub/templates`
- 建立 `/api/hub/ecard/*`
- 建立 `/api/hub/richmenus/*`
- 建立 `/api/hub/voom/*`

### Phase 4: SDK

- 建立 `/sdk/mycard-hub.js`
- 提供 ecard、richMenu、voom 三個 namespace
- 寫基本使用文件

### Phase 5: 管理工作台

- 保留輕量管理介面
- 不做大型 landing page
- 以模組清單、模板管理、資料預覽、API 測試為主

## 目前結論

名片王後續資料庫正式採用 Wasabi JSON 與 Wasabi Object Storage。

`mylittlesys` 是能力來源與模板參考，不是整包複製目標。

第一批模組先做：

1. 圖文選單工具
2. LINE VOOM 影片擷取器
3. 電子名片模板庫

完成後，其他專案只需要串名片王的 API 或 SDK，不需要每次重寫同一套工具。
