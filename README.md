# 積木大逃脫 Brick Escape

色塊滑出益智遊戲（玩法參考 *Block Out! – Color Sort Puzzle* / *Color Block Jam* 類型）：
拖曳樂高風格的積木，送到**同顏色的門**就會滑出去，在時間內清空棋盤即可過關。共 30 關。

## 執行

需要用本機伺服器開啟（音效用 Web Audio 載入）：

```bash
python -m http.server 8126 --directory BrickEscape
```

然後瀏覽 <http://localhost:8126>。直接雙擊 `index.html` 也能玩（音效會改用 `<audio>` 備援）。

## 玩法與機制

關卡分成 **6 大關 × 5 小關**：新手村、單行道、冰封寶庫、積木工廠、迷宮花園、彩虹終點。
所有關卡一開始就可以自由選擇。

| 機制 | 首次登場 | 說明 |
|---|---|---|
| 拖曳 / 同色門 | 1 | 方塊須完全對齊門口、寬度不超過門寬才能出去 |
| 方塊互擋、形狀 | 2–6 | 1～6 格的各種多格骨牌 |
| 單向方塊 ↔ ↕ | 7 | 只能沿箭頭方向移動 |
| 石柱 | 9 | 固定障礙 |
| 冰凍方塊 | 11 | 數字＝還要送走幾個方塊才融化 |
| 鑰匙與鎖 | 13 | 鑰匙方塊出門後，上鎖方塊才能動 |
| 彩虹抽屜 | 15 | 黑白小方塊從上/下門離開，彩色長條才能到右側的門 |
| 雙層外殼 | 16 | 先過外殼顏色的門剝殼，再送出內層顏色 |
| 方塊製造機 | 18 | 出口空出時推出新方塊 |
| 移動門 | 21 | 每走一步門沿軌道移動一格 |
| 藤蔓門 | 23 | 送走 N 個方塊後才開啟 |
| 變色門 | 26 | 每走一步換一個顏色 |

道具（用金幣購買）：凍結時間、鐵鎚（敲冰/鎖或小方塊）、火箭（炸掉一個方塊）、飛碟（吸走同色方塊）。
星等依剩餘時間計算；進度、金幣、道具存在 `localStorage`。

## 專案結構

```
index.html, css/style.css
js/engine.js     規則核心（純邏輯，瀏覽器與 node 共用）
js/levels.js     30 關資料（由 tools/build-levels.js 產生）
js/audio.js      音樂 / 音效
js/game.js       畫面、Canvas 繪製、拖曳物理、道具、進度
assets/img       封面、背景、道具圖示（H站 / Higgsfield GPT Image 2 生成）
assets/sfx       背景音樂與 18 種音效（ElevenLabs Music v2.5 / Sound Effects v2 生成，執行時自動音量正規化）
tools/           關卡工具（solver、生成器、模板）
```

## 關卡工具

```bash
node tools/solve.js            # 驗證全部關卡可解，列出最少「擺放」步數
node tools/genall.js           # 依 tools/templates.js 隨機生成候選關卡（多核心平行）
node tools/build-levels.js     # 組合手工關卡 + 生成關卡 → js/levels.js（含解題驗證與時間計算）
```

每一關都經過 solver 實際解出並逐步重播驗證；時間限制依解法長度自動計算。
另外 `node tools/solve.js --json` 會輸出 `tools/solutions.json`，在瀏覽器 console 執行
`eval(await (await fetch('tools/autoplay.js')).text()); await __autoplay(關卡索引)`
即可用真實的拖曳事件自動破關（30 關都已用這個方式在遊戲中實際通關驗證過）。
