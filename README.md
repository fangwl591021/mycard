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
