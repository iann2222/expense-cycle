# ExpenseCycle 專案架構與檔案職責（2026-01-13 更新版）

本文件說明 ExpenseCycle 的核心架構、資料流與檔案責任邊界。
專案會持續擴充（PWA、分析報表、標籤等），但應維持清楚分工，避免 App.tsx 成為超大型混合檔。

---

## 架構總覽（分層概念）

ExpenseCycle 主要分成以下幾層：

### 1) Global Layer（全域層）
負責：React 掛載、ThemeProvider、全域主題與 Css baseline / styles 等初始化。

### 2) App Shell（應用骨架）
負責：AppBar / Drawer、主要 View 切換、把資料與 actions 串接到各頁面（views）。
App.tsx 目標是「組裝層」，避免放進大量業務流程與工具函式。

### 3) State Layer（狀態層 / Hooks）
負責：把「資料持久化」、「使用者偏好」、「檢視狀態」、「備份/時區/時間」等各種狀態抽成 hooks。
- Data state：與 IndexedDB 讀寫與資料策略相關
- Preference state：與使用者偏好相關（localStorage）
- UI/View state：與當下畫面呈現方式相關（搜尋、篩選、排序、當前頁）

### 4) Views（頁面層）
負責：一個頁面所需的資料整理與版面呈現（如 Items / Trash / Settings / Analysis / Tags）。
頁面可以組合 components，但不要直接碰 DB 實作細節。

### 5) Components（元件層）
負責：可重用 UI，盡量呈現導向（presentational），或在明確範圍內封裝 UI 對話框（Dialogs）。
元件不直接碰 IndexedDB；資料行為由 props 傳入。

### 6) Utils（純函式層）
負責：可重用的純計算或工具（日期、金額、排序、搜尋、週期推算、顏色、UUID）。
應避免在 utils 內存取 React state；保持可測、可替換。

---

## 資料儲存與來源（簡述）

- 訂閱/支出項目資料：IndexedDB（透過 useItems 統一管理）
- 使用者偏好（主題、預設檢視、提醒等）：localStorage（透過 useSettings 統一管理）
- 標籤顏色：localStorage（透過 useTagColors 統一管理）
- 匯出/匯入：JSON 檔案（useBackup 統一包裝流程，資料來源仍來自 useItems.exportBackup / importBackupReplace）

---

## 目錄與檔案職責（意義框架）

> 原則：檔案很多時，先看「放在哪一層」就能大概理解職責。
> 同層的檔案，盡量維持單一責任。

---

# src/

## 1) Entry / Global

### src/main.tsx
範疇：全域初始化（Global Layer）
- React 掛載至 #root
- 建立 MUI Theme（通常依 settings.themeMode）
- 提供 ThemeProvider
- 將全域設定與 actions 傳入 App（或未來改用 Context）

---

## 2) App Shell

### src/App.tsx
範疇：應用骨架與資料串接（App Shell）
- AppBar / Drawer / 主要內容容器
- View 切換與頁面導向（items / trash / settings / analysis + tags 子流程）
- 串接各種 hooks：useItems / useSettings / useViewState / useNowUTC8 / useBackup / useTzWarningUTC8 / useTagColors / useTagOps
- 將資料與 actions 傳給 views/components（避免把細節堆在 App）

---

## 3) Types

### src/types/models.ts
範疇：領域模型（Domain Model）
- SubscriptionItem 等資料結構與欄位型別
- UI / state / utils 共用的型別契約
- 避免同一資料結構在不同檔案被重複定義

---

## 4) State（Hooks / 狀態層）

### src/state/useItems.ts
範疇：資料層（Data Layer，IndexedDB）
- IndexedDB 開啟、讀寫、CRUD
- 回收桶策略（軟刪除/還原/永久刪除 + 到期清除）
- 匯出/匯入 payload（exportBackup / importBackupReplace）
- 對外輸出乾淨 API（activeItems / trashItems / items / loading）

### src/state/useSettings.ts
範疇：使用者偏好（localStorage）
- Settings schema（版本、預設值、容錯解析）
- actions（setThemeMode、預設檢視、提醒天數等）
- 持久化：與瀏覽器 + origin 綁定

### src/state/useViewState.ts
範疇：檢視狀態（UI/View State）
- 當下 view、drawer open/close
- 搜尋文字、標籤篩選、排序鍵與順序
- 當下統計口徑（依原週期/月/年）
- 可「回復預設」（回到 settings 的預設狀態）

### src/state/useNowUTC8.ts
範疇：時間狀態（UTC+8）
- 提供 nowISO 與顯示用時間（每分鐘 tick + focus/visibility 補強）
- 讓 UI 顯示「目前時間」與相關計算一致

### src/state/useTzWarningUTC8.ts
範疇：時區偵測狀態
- 偵測裝置是否為 UTC+8（Asia/Taipei）
- 控制提示 Dialog 開關與「今天不再提示」記錄

### src/state/useTagColors.ts
範疇：標籤顏色狀態（localStorage）
- 讀寫 tagColors
- setTagColor / replaceAll 等操作
- 讓 TagsView / ItemCard / Drawer 可一致使用同一顏色來源

### src/state/useTagOps.ts
範疇：標籤批次操作（依 items）
- renameTag：批次更新 items 的 tags，並同步 tagColors
- removeTag：批次移除 items 中某 tag，並同步 tagColors
- 放在 state 層，避免 Page/Component 自己遍歷 items 寫資料

### src/state/useBackup.ts
範疇：備份流程封裝（檔案 I/O）
- exportToFile：把 exportBackup 包裝成下載 JSON
- importFromFile：讀檔、parse JSON、同步 tagColors、呼叫 importBackupReplace
- 匯入結果狀態（成功/失敗訊息）統一管理，供 UI Dialog 呈現

---

## 5) Utils（純函式）

### src/utils/dates.ts
- UTC+8 日期/時間格式工具（例如 todayISO_UTC8、12 小時制顯示等）

### src/utils/money.ts
- 金額格式化、月/年換算等顯示工具

### src/utils/recurrence.ts
- 週期推算引擎（可繳日/截止日的下一期推算、月底對齊等）

### src/utils/search.ts
- 搜尋匹配（名稱/標籤/備註等）

### src/utils/sort.ts
- 排序比較器（包含 nextDates 對齊策略）

### src/utils/uuid.ts
- safeUUID fallback（避免部分手機/WebView 不支援 crypto.randomUUID）

### src/utils/colors.ts
- 顏色輔助（文字可讀性計算、hover 色位移等）
- 讓標籤顏色/顯示策略集中管理，避免散在各元件

---

## 6) Views（頁面層）

### src/views/ItemsView.tsx
- 首頁清單頁呈現（總計、卡片列表、FAB 新增）
- 接收可見 items、nextDateMap、settings、tagColors 等，組合 ItemCard

### src/views/TrashView.tsx
- 回收桶頁（固定按刪除時間排序 + 還原/永久刪除）

### src/views/TagsPage.tsx
- 標籤管理頁容器（承接 items/tagColors 與操作，轉交給 TagsView）
- Page 負責串接資料，View 元件負責 UI 細節

### src/views/SettingsPage.tsx
- 設定頁容器（承接 settings/actions、備份匯入匯出、資料來源資訊）
- 內部使用 SettingsView 呈現

### src/views/AnalysisPage.tsx
- 分析報表頁（目前先做基礎項目分佈；未來可擴充標籤統計）

---

## 7) Components（可重用 UI）

### src/components/AppDrawer.tsx
- 左側選單（導覽 + 首頁工具的 accordion：搜尋/篩選/排序/口徑）
- Drawer 只負責 UI 與互動，不負責資料來源與業務策略

### src/components/ItemCard.tsx
- 單一項目卡片呈現（名稱、日期、標籤、到期狀態、已繳費確認等）
- 點擊卡片進入編輯（由上層控制）

### src/components/ItemDialog.tsx
- 新增/編輯對話框（表單、驗證、日期選擇器、dirty 確認等）
- 不直接寫 DB：透過 onSubmit / onMoveToTrash 等 props

### src/components/SettingsView.tsx
- 設定頁內容 UI（切換主題、預設檢視/排序、顯示資料來源、匯入匯出入口）
- 實際行為由 SettingsPage / App 提供

### src/components/TagsView.tsx
- 標籤管理 UI（顏色選擇、改名、移除確認）
- 顏色策略透過 utils/colors.ts 統一，避免重複判斷

### src/components/ImportResultDialog.tsx
- 匯入結果 UI 對話框（成功/失敗顯示）

### src/components/TzWarningDialog.tsx
- 時區提示 UI 對話框（只支援 UTC+8 的提醒）

---

# 典型資料流範例（重要）

本區列出幾個專案中最常見、也最具有代表性的資料流，協助理解目前架構的設計意圖。

---

## ① 新增 / 編輯項目

### 流程

使用者操作  
→ ItemCard / FAB 點擊  
→ App.tsx 開啟 ItemDialog  
→ ItemDialog 編輯表單狀態（本地 state）  
→ 使用者按「儲存」  
→ 呼叫 onSubmit(item)  
→ App.tsx  
→ useItems.add(item) 或 useItems.update(item)  
→ IndexedDB 寫入  
→ useItems state 更新  
→ ItemsView 重新渲染  
→ ItemCard 列表更新  

### 設計重點

- ItemDialog 不知道資料存在 IndexedDB  
- App 負責決定「這是新增還是更新」  
- useItems 是唯一實際操作資料庫的地方  

---

## ② 首頁搜尋 / 篩選 / 排序

### 流程

使用者操作 Drawer（搜尋 / 點標籤 / 改排序）  
→ useViewState 更新（searchText / selectedTags / sortKey...）  
→ App.tsx useMemo  
→ visibleActiveItems 重新計算  
→ ItemsView 重新 render  

### 設計重點

- useViewState 只負責「UI 狀態」  
- utils/search.ts、utils/sort.ts 為純計算  
- 不影響資料本體（items 不變）  

---

## ③ 週期推算（下一次可繳日 / 截止日）

### 流程

useNowUTC8 提供 todayISO  
→ App.tsx useMemo  
→ 對每個 activeItems 呼叫 computeNextDates  
→ 產生 nextDateMap  
→ 傳入 ItemsView / ItemCard  
→ 卡片顯示下一期日期與到期狀態  

### 設計重點

- recurrence.ts 為純引擎，不存任何狀態  
- App 統一計算，避免每張卡片各自算一遍  

---

## ④ 標籤管理（改名 / 移除）

### 流程（改名為例）

使用者在 TagsView 輸入新名稱  
→ TagsPage 呼叫 onRenameTag  
→ useTagOps.renameTag  
→ 遍歷 items，呼叫 useItems.update  
→ IndexedDB 更新  
→ 同步更新 tagColors  
→ useItems state 更新  
→ ItemsView / TagsView / Drawer 同步刷新  

### 設計重點

- 標籤不是獨立表，而是「依附於 items」  
- useTagOps 封裝批次資料異動  
- UI 層不自己遍歷 items 寫 DB  

---

## ⑤ 設定與主題切換

### 流程

使用者在 SettingsView 切換主題  
→ 呼叫 useSettings.actions.setThemeMode  
→ localStorage 儲存  
→ main.tsx / App 接收新的 settings  
→ ThemeProvider 重建 theme  
→ 全站即時切換  

### 設計重點

- useSettings 是偏好唯一來源  
- UI 不自己碰 localStorage  

---

## ⑥ 匯出 / 匯入備份

### 匯出流程

使用者點「匯出」  
→ SettingsPage 呼叫 useBackup.exportToFile  
→ useItems.exportBackup 取得資料  
→ useTagColors 取得顏色  
→ useBackup 組合 payload  
→ 建立 JSON 檔下載  

### 匯入流程

使用者選檔  
→ useBackup.importFromFile  
→ 解析 JSON  
→ 顯示 MUI 確認 Dialog  
→ 確認後呼叫 useItems.importBackupReplace  
→ 覆蓋 IndexedDB  
→ 同步 tagColors  
→ useItems state 更新  
→ 全站畫面刷新  

### 設計重點

- useBackup 管流程與風險提示  
- useItems 管資料庫策略  
- UI 只處理互動  


---

## 放置原則（後續擴充時遵循）

- 「資料策略 / 持久化 / 匯入匯出」：優先放 state（useItems / useBackup）
- 「使用者偏好」：放 useSettings（localStorage + schema）
- 「當下畫面狀態」：放 useViewState（搜尋/篩選/排序/口徑）
- 「純計算」：放 utils（可測、可重用）
- 「頁面容器」：放 views（負責串接資料與版面）
- 「可重用 UI 元件」：放 components（不直接碰 DB）

---

## 近期可預期的擴充（備註）

- PWA 化：manifest / service worker（會新增 public/ 或 vite-pwa 設定檔）
- 分析報表進階：加入標籤統計與更多圖表
- 標籤排序拖曳：可能新增 tagOrder（localStorage）與 DnD component

