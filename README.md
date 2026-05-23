# 名片王 SaaS MVP

這是一個可部署到 Cloudflare Workers 的數位名片 SaaS 前端原型。目前版本不使用 Cloudflare KV、D1、R2，資料先保存在瀏覽器 `localStorage`，方便快速確認產品流程。

## 目前功能

- 管理後台與基本 SaaS 指標
- 名片新增、編輯、複製、刪除
- 三種名片版型切換
- 公開分享頁預覽與分享連結
- 名單與互動資料模擬
- JSON 匯出
- Worker API 骨架：LIFF 登入、Wasabi JSON/圖片路徑、GPT OCR、個人查重、成功建卡送 10 點

## 使用方式

本機直接開啟：

```text
D:\OneDrive\文件\名片王\public\index.html
```

## Content Hub API

名片王後續作為內容倉庫與共用工具能力中台。第一版已建立 `/api/hub/*` API 與輕量 SDK，資料庫以 Wasabi JSON / Object Storage 為準，不使用 KV、D1、R2 當主要資料庫。

### 已建立的模組

- `ecard`: 電子名片模板庫，先提供 V1 / V2 / V3 / V4 內建模板與 Flex JSON 產生器。
- `rich-menu`: 圖文選單工具，先提供 Rich Menu schema 正規化、驗證、LINE payload render 與發布入口。
- `voom`: LINE VOOM 影片擷取器，先提供 URL 擷取工作與 Wasabi JSON job 紀錄。

### API

```text
GET  /api/hub/modules
GET  /api/hub/templates
GET  /api/hub/templates?type=ecard
GET  /api/hub/templates/{template_id}
POST /api/hub/ecard/render
POST /api/hub/ecard/flex
POST /api/hub/richmenus/validate
POST /api/hub/richmenus/render
POST /api/hub/richmenus/publish
POST /api/hub/voom/extract
GET  /api/hub/voom/jobs/{job_id}
```

### SDK

```js
import { createMyCardHub } from "https://myvard.fangwl591021.workers.dev/sdk/mycard-hub.js";

const hub = createMyCardHub({
  apiBase: "https://myvard.fangwl591021.workers.dev",
  token: userToken
});

const templates = await hub.ecard.listTemplates();
const flex = await hub.ecard.generateFlex("ecard-v2-business-card", {
  name: "方萬隆",
  title: "創意總監",
  company: "名片王"
});
```

Worker 開發模式：

```bash
npm run dev
```

部署：

```bash
npm run deploy
```

目標 Worker：

```text
https://myvard.fangwl591021.workers.dev/
```

## 建議下一階段

1. 將前端 LIFF login 接到 `POST /api/auth/line`。
2. 將拍照上傳接到 `POST /api/cards/scan`。
3. 在畫面上呈現重複名片、OCR 失敗、成功送 10 點三種狀態。
4. 補公開分享頁 `/card/:slug`。
5. 串接 GitHub repo：`fangwl591021/mycard`，確認後再部署。

## API 文件

請見：

```text
docs/api-permissions.md
```
