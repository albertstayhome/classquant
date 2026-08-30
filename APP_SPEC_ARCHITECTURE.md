# ClassQuant Hub - 系統規格與標準化 UI 元件架構地圖 (AI Agent Operating Specification)

本文件定義了 ClassQuant Hub 的全系統架構、視圖拓撲、元件定位與自動化操作 API，供人類開發者或任何 AI 代理人（Agent）進行精準的操作、測試與維護。

---

## 🏛️ 1. 視圖拓撲 (View Topology)

ClassQuant Hub 採用單頁應用（SPA）架構，主要視圖由 `window.appState.switchTab(tabId)` 控制切換：

| Tab ID | 視圖名稱 | DOM 容器 ID | 核心職責 |
| :--- | :--- | :--- | :--- |
| `matrix` | 課堂點記板 | `#classroom-matrix-view` | 課堂即時座位點名、快選、自訂快速標籤記點、抽籤與衝突事件。 |
| `roster` | 班級名單 | `#roster-manager-view` | 1 秒 Excel 批次貼上名單、新增/刪除班級、座號與姓名微調。 |
| `retro` | 事後補記 | `#retro-log-view` | 課後回憶補記、單雙號快選、帶入常用評語批次提交。 |
| `dashboard`| 統計戰情室 | `#dashboard-view` | 學業與常規四象限分析、趨勢圖、個別學生雷達圖與 Excel 導出。 |
| `events` | 點記歷程 | `#events-log-view` | 全校/班級流水帳歷史紀錄、點數回溯撤銷 (Undo)。 |
| `timetable` | 智慧課表 | `#timetable-view` | 每週課表排定、當前課堂自動感知聯動。 |
| `settings` | 系統設定 | `#settings-view` | 本地備份/還原、主題切換、音效開關、重設系統資料。 |

---

## 🗺️ 2. 全域標準化 UI 元件地圖 (`AppUIMap`)

所有元件均可透過全域物件 `window.AppUIMap` 取得標準 CSS 選擇器：

```javascript
// 範例：切換至班級名單
document.querySelector(AppUIMap.TABS.ROSTER).click();

// 範例：點擊 1 號學生座位
document.querySelector(AppUIMap.MATRIX.SEAT_CARD(1)).click();

// 範例：觸發第一項快速加分標籤
document.querySelector(AppUIMap.MATRIX.FIRST_QUICK_TAG_BTN).click();
```

### 主要選擇器索引對照表：

```javascript
AppUIMap.TABS.MATRIX                  // 點記板分頁按鈕
AppUIMap.TABS.ROSTER                  // 班級名單分頁按鈕
AppUIMap.TABS.RETRO                   // 事後補記分頁按鈕
AppUIMap.TABS.DASHBOARD               // 戰情室分頁按鈕

AppUIMap.HEADER.CLASS_SELECT          // 頂部全域班級切換下拉選單 (#global-class-select)
AppUIMap.HEADER.VERSION_BADGE         // 頂部版本號徽章 (#header-version-badge)

AppUIMap.MATRIX.SEAT_CARD(seatNo)     // 座位卡片 (#seat-card-1)
AppUIMap.MATRIX.FIRST_QUICK_TAG_BTN   // 第一個快速標籤按鈕 (#first-quick-tag-btn)
AppUIMap.MATRIX.CUSTOM_TAG_OPEN_BTN   // 快速標籤「⚙️ 自訂」按鈕 (#custom-tag-open-btn)

AppUIMap.ROSTER.BATCH_PASTE_BTN       // 批次貼上按鈕 (#roster-paste-btn)
AppUIMap.ROSTER.STUDENT_NAME_INPUT(1) // 1 號學生姓名輸入框 (#roster-student-name-input-1)

AppUIMap.MODAL.OVERLAY                // 全域彈窗遮罩 (#global-modal)
AppUIMap.MODAL.CONTENT                // 全域彈窗內容區 (#global-modal-content)
AppUIMap.MODAL.BATCH_PASTE_TEXTAREA   // 批次貼上文字輸入框 (#batch-roster-textarea)
AppUIMap.MODAL.BATCH_PASTE_SUBMIT_BTN // 批次貼上一鍵匯入按鈕 (#batch-roster-submit-btn)
```

---

## 🤖 3. 自動化操作模式 (AI Agent Action Protocol)

任何 AI 代理人接手本專案時，可直接調用以下核心 API 進行狀態操作：

### 1. 班級與資料操作
- 切換班級：`window.appState.handleManualClassChange('801')`
- 切換分頁：`window.appState.switchTab('roster')`
- 彈窗關閉：`window.appState.closeModal()`
- 彈窗開啟（標籤）：`window.tagManager.openTagManagerModal()`
- 彈窗開啟（名單貼上）：`window.rosterManager.openBatchPasteModal('801')`

### 2. 批次名單匯入自動化
```javascript
// 1. 開啟貼上視窗
window.rosterManager.openBatchPasteModal('801');
// 2. 填入資料
document.querySelector('#batch-roster-textarea').value = "1 王小明\n2 李小華\n3 陳美麗";
// 3. 觸發儲存
window.rosterManager.applyBatchPaste('801');
```

---

## 🛡️ 4. 設計規範與約束 (Architecture Constraints)
1. **三級顏色規範 (3-Tier Colors)**：
   - 綠色 (`emerald`)：正向加分 (`+`)。
   - 紅色 (`rose`)：扣分與警示 (`-`)。
   - 灰色/石板藍 (`slate`/`blue`)：中性事記或學業均分 (`0`)。
2. **PWA 離線優先**：所有靜態資源與腳本須註冊於 `service-worker.js`，並支援版本化查詢快取更新。
