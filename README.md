# 花花草草 · Bloom Garden 🌷

一款輕鬆的養成類小遊戲（PWA 網頁 App）：種花、種草、澆水、收獲，把小花園慢慢擴大。

線上版：<https://Zhufacheng.github.io/bloom-garden/>

## 玩法

1. 在「花店」買種子，點按空地種下
2. 用「澆水」工具保持水分（水乾了植物會停止生長，出現 💧 提示時快澆水）
3. 植物成熟發光後，用「收獲」工具採摘，賺取金幣
4. 用金幣擴充更多土地（3×3 → 5×3），解鎖更大的花園

| 植物 | 種子 | 成熟時間 | 賣價 |
| --- | --- | --- | --- |
| 青草 Grass | 5 | 20 秒 | 12 |
| 雛菊 Daisy | 12 | 35 秒 | 30 |
| 鬱金香 Tulip | 25 | 50 秒 | 65 |
| 向日葵 Sunflower | 45 | 75 秒 | 125 |
| 玫瑰 Rose | 80 | 110 秒 | 220 |

- **每日任務**：每天 3 個隨機任務（收獲/澆水/賺金幣/種植），完成領金幣，每天 0 點刷新
- **音效**：種植、澆水、收獲、領獎都有音效（Web Audio 生成，右上角 🔊 可靜音）

進度自動存在手機上（localStorage），離開一段時間再回來，植物也會繼續長大（離線補算最多 8 小時）。

## 在 iPhone 上安裝

1. 用 **Safari** 開啟 <https://Zhufacheng.github.io/bloom-garden/>
2. 點底部的「分享」按鈕 →「加入主畫面」
3. 桌面上就會出現「花花草草」圖示，點開是全畫面 App 體驗，且支援離線

## 本地開發

```bash
npm install
npm run dev      # 開發伺服器
npm run test     # 單元測試（vitest）
npm run build    # 型別檢查 + 建置到 dist/
```

## 技術

React + TypeScript + Vite，原生 CSS（手繪 SVG 植物圖形），localStorage 存檔，
Service Worker 離線快取。

## 部署

目前以「本地建置 → 推送 `gh-pages` 分支」的方式部署到 GitHub Pages：

```bash
npm run build
# 將 dist/ 內容推送到 gh-pages 分支即可
```

`.github/workflows/deploy.yml`（GitHub Actions 自動部署）已備妥，
等 GitHub token 加上 `workflow` scope 後 commit 上去即可啟用。
