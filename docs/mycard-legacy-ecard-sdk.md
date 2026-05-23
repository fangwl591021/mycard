# 名片王 V1-V4 電子名片 SDK 引用文件

版本：v1.0  
適用：外部網站、Cloudflare Worker、APP WebView、LIFF、LINE Bot 後端、後台系統  
SDK URL：

```txt
https://myvard.fangwl591021.workers.dev/sdk/mycard-hub.js
```

## 1. 用途

外部專案只要引用這支 SDK，就可以直接讀取名片王內容倉庫裡的 V1-V4 電子名片模板，不需要在每個專案重寫名片模板、Flex JSON 結構、欄位規格。

目前支援：

| 版本 | 模板 ID | 用途 |
|---|---|---|
| V1 | `ecard-v1-video-guide` | 影片導購 |
| V2 | `ecard-v2-business-card` | 個人名片 |
| V3 | `ecard-v3-catalog` | 商品目錄 |
| V4 | `ecard-v4-video-rich-menu` | 影音圖文選單 |
| Rich Menu | `rich-menu-basic-2500` | LINE 圖文選單 |

## 2. 安裝方式

前端或 LIFF 可直接用 ES Module 引用：

```html
<script type="module">
import { createMyCardHub } from "https://myvard.fangwl591021.workers.dev/sdk/mycard-hub.js";

const hub = createMyCardHub();
</script>
```

後端 Node.js 也可使用：

```js
import { createMyCardHub } from "https://myvard.fangwl591021.workers.dev/sdk/mycard-hub.js";

const hub = createMyCardHub();
```

## 3. 一次取得 V1-V4 模板

```js
import { createMyCardHub } from "https://myvard.fangwl591021.workers.dev/sdk/mycard-hub.js";

const hub = createMyCardHub();

const templates = await hub.ecard.legacy.getAll();

console.log(templates.v1);
console.log(templates.v2);
console.log(templates.v3);
console.log(templates.v4);
```

回傳物件：

```js
{
  v1: { template_id, name, sample_data, fields, ... },
  v2: { template_id, name, sample_data, fields, ... },
  v3: { template_id, name, sample_data, fields, ... },
  v4: { template_id, name, sample_data, fields, ... }
}
```

## 4. 直接產生 Flex JSON

### V1 影片導購

```js
const result = await hub.ecard.legacy.v1({
  title: "請輸入姓名或公司名稱",
  desc: "✨一行建議16個字\n✨可以簡介公司或是活動內容",
  v: "https://example.com/video.mp4",
  p: "https://example.com/preview.jpg"
});

console.log(result.flex);
```

### V2 個人名片

```js
const result = await hub.ecard.legacy.v2({
  title: "方萬隆",
  desc: "創意總監\n名片王",
  logo: "https://example.com/avatar.jpg",
  buttons: [
    { t: "加入好友", u: "https://line.me" }
  ]
});

console.log(result.flex);
```

### V3 商品目錄

```js
const result = await hub.ecard.legacy.v3({
  hero_url: "https://example.com/main.jpg",
  items: [
    {
      img: "https://example.com/product.jpg",
      desc: "商品標題建議兩行內，呈現最美觀的比例。",
      price: "500",
      btnText: "買",
      data: "buy_01"
    }
  ]
});

console.log(result.flex);
```

### V4 影音圖文選單

```js
const result = await hub.ecard.legacy.v4({
  header_text: "點擊影片開啟完整影音",
  video_url: "https://example.com/video.mp4",
  preview_url: "https://example.com/preview.jpg",
  base_image: "https://example.com/menu.jpg",
  design_width: 2500,
  zones: [
    { label: "官方網站", uri: "https://line.me", x: 120, y: 160, w: 620, h: 280 }
  ]
});

console.log(result.flex);
```

## 5. 用版本代號產生 Flex

```js
await hub.ecard.legacy.generateFlex("v1", data);
await hub.ecard.legacy.generateFlex("v2", data);
await hub.ecard.legacy.generateFlex("v3", data);
await hub.ecard.legacy.generateFlex("v4", data);
```

## 6. 用模板 ID 產生 Flex

```js
import {
  createMyCardHub,
  LEGACY_ECARD_TEMPLATE_IDS
} from "https://myvard.fangwl591021.workers.dev/sdk/mycard-hub.js";

const hub = createMyCardHub();

const result = await hub.ecard.generateFlex(
  LEGACY_ECARD_TEMPLATE_IDS.v2,
  {
    title: "方萬隆",
    desc: "創意總監\n名片王"
  }
);

console.log(result.flex);
```

## 7. 模板 ID 常數

```js
import { LEGACY_ECARD_TEMPLATE_IDS } from "https://myvard.fangwl591021.workers.dev/sdk/mycard-hub.js";

console.log(LEGACY_ECARD_TEMPLATE_IDS);
```

內容：

```js
{
  v1: "ecard-v1-video-guide",
  v2: "ecard-v2-business-card",
  v3: "ecard-v3-catalog",
  v4: "ecard-v4-video-rich-menu"
}
```

## 8. API 端點

SDK 背後使用以下 API：

```txt
GET  /api/hub/templates?type=ecard
GET  /api/hub/templates/{template_id}
POST /api/hub/ecard/flex
GET  /api/hub/richmenus/templates
POST /api/hub/richmenus/validate
POST /api/hub/richmenus/render
POST /api/hub/richmenus/publish
```

完整 URL 範例：

```txt
https://myvard.fangwl591021.workers.dev/api/hub/templates?type=ecard
```

## 9. 圖文選單 SDK

### 9.1 取得圖文選單模板

```js
import { createMyCardHub } from "https://myvard.fangwl591021.workers.dev/sdk/mycard-hub.js";

const hub = createMyCardHub();

const templates = await hub.richMenu.listTemplates();
console.log(templates.templates);
```

### 9.2 取得標準 2500 x 1686 模板

```js
const template = await hub.richMenu.getBasicTemplate();
const config = template.sample_data;

console.log(config);
```

### 9.3 驗證圖文選單設定

```js
const result = await hub.richMenu.validate({
  name: "MyCard Rich Menu",
  chatBarText: "Menu",
  selected: true,
  size: { width: 2500, height: 1686 },
  areas: [
    {
      bounds: { x: 0, y: 0, width: 1250, height: 843 },
      action: { type: "uri", uri: "https://example.com" }
    },
    {
      bounds: { x: 1250, y: 0, width: 1250, height: 843 },
      action: { type: "message", text: "mycard" }
    }
  ]
});

console.log(result.valid);
console.log(result.issues);
console.log(result.richMenu);
```

### 9.4 產生可用 Rich Menu JSON

```js
const rendered = await hub.richMenu.render(config);
console.log(rendered.richMenu);
```

### 9.5 發布圖文選單

發布需要 LINE Channel Access Token 與圖文選單圖片 base64。這類密鑰不可放在前端，建議只在後端使用。

```js
const published = await hub.richMenu.publish(config, {
  imageBase64: "data:image/png;base64,...",
  channelAccessToken: "LINE_CHANNEL_ACCESS_TOKEN"
});

console.log(published);
```

## 10. 注意事項

1. 讀模板與產 Flex 不需要 Secret Key。
2. Wasabi Secret Key 不可放在外部專案前端。
3. 修改模板、Seed 模板才需要 `MIGRATION_ADMIN_TOKEN`。
4. 外部專案只需要讀 SDK 與呼叫公開 API。
5. V1-V4 的欄位規格以舊系統原版為準，已保留舊資料格式。
6. 發布 Rich Menu 需要 LINE Channel Access Token，請放後端，不要放瀏覽器。
