# 今日心水

只讀足球心水板，給手機同桌面。介面跟已核准的設計頁：新聞紙底、40px 印戳欄、取／棄／觀，以及開波後同一套五步。平台不登入、不落注、沒有注碼單。

畫面上的場次同賠率係「示範賽程」，對應設計線框，不是香港賽馬會彩池，亦沒有從馬會網站擷取。

## 點樣跑

```bash
npm install
npm run dev
```

然後開 [http://127.0.0.1:43127](http://127.0.0.1:43127)。

`npm run dev` 會喺本機起 Convex（唔使登入）、寫入示範賽程，再起 Vite。瀏覽器只連去 Vite；`/api` 會代理去本機 Convex。

GitHub Pages 用同一套示範賽程，唔使連住呢部機嘅 Convex。推上 `main` 之後，Actions 會發佈到 `https://tempowong.github.io/today-picks/`。

其他指令：

```bash
npm test
npm run typecheck
```

## 路由

- `/` 今日一覽。窄屏係卡片；闊屏（約 1024 以上）係左列加右欄，預選進行中嘅追蹤場。
- `/matches/$matchId` 單場詳情。窄屏有返回「今日心水」；闊屏仍然係一覽加右欄。
- `?board=empty` 空日：今日未有已核對場次
- `?board=stale` 過期：核對時間 14:02，仍顯示上次已核對內容
- `?board=error` 讀取失敗，可重試
- `?board=loading` 列骨架

## 資料

型別喺 `src/domain/types.ts`，由設計頁 `typesSource` 抽出。Convex schema 喺 `convex/schema.ts`。查詢 `board.today` 返回當日版面同賽事；`seed.reset` 寫入九場示範賽程。注碼只得棄單 $0 同細注 $50。
