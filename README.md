# 今日心水

只讀審稿版。公開資料，不下注、不登入。

每個定時刊次讀兩個公開頁：https://bet.hkjc.com/ch/football/home 與 https://football.hkjc.com 。賠率來自公開 GraphQL。盤口信心未有公式，已刊出的心水顯示「待公式」。

出刊時間只限香港時間 07:00、10:00、13:00、16:00、19:00、22:00。23:00 至 07:00 不開新刊。即場更新不是新刊。

## 本地

```bash
npm install
npm run dev
```

瀏覽器開 http://127.0.0.1:43127 。

手動提取當前刊次：

```bash
node --experimental-strip-types scripts/fetch-board.mjs
```

其他指令：`npm test`、`npm run typecheck`。

## 路由

- `/` 今日：未開與進行中。預設列出全部，進行中在前。
- `/m/$matchId` 單場五步。窄屏整卡進入；闊屏左列加右欄。
- `/history` 往績：已完場。篩選全部／贏／輸／不入帳。
- `?preview=before` 07:00 前，等待首刊
- `?preview=between` 刊次之間，沿用上一刊
- `?preview=empty` 今日未有已核對場次
- `?preview=error` 無法讀取公開彩池，可重試
- `?preview=loading` 列骨架
- `?preview=qa` 版面示範佔位。正式版面不會讀這套場次。

## 公開網站

https://tempowong.github.io/today-picks/

GitHub Actions 在六個刊次提取公開彩池，然後更新網站。推程式碼本身不會當成新刊。
