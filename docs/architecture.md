# ExpenseCycle 專案架構與檔案職責

本文件說明 ExpenseCycle 的核心架構與各檔案在「意義框架」上的責任邊界。
在功能持續擴充時，應仍維持清楚、可維護的分工。

---

## 架構總覽

- Global Layer（全域層）
  - 負責：Theme、CssBaseline、App 初始化、使用者偏好（例如主題模式）
- App Shell（應用骨架）
  - 負責：AppBar / Drawer / View 切換、把資料與操作串接到各視圖
- Data Layer（資料層）
  - 負責：IndexedDB、本機持久化、回收桶策略、匯入匯出
- UI Components（介面元件層）
  - 負責：呈現 UI、表單輸入與驗證、觸發上層行為（不直接碰 DB）

---
---
---

## 檔案職責清單

### src/main.tsx
範疇：全域初始化與全域設定（Global Layer）
- 掛載 React 到 #root
- 提供 ThemeProvider / createTheme
- 提供 CssBaseline
- 管理「全域狀態」入口（例如主題模式、語系、全域偏好）
- 將全域設定以 props（或未來 Context）傳入 App
- main.tsx 不再直接碰 localStorage，而是透過 useSettings 取得 settings.themeMode 來建立 theme（全域效果在 main，資料來源在 useSettings）

目前功能例：
- 淺色/深色模式
- 主題模式持久化（localStorage）

---

### src/App.tsx
範疇：App 骨架與 View 切換（App Shell）
- AppBar、Drawer、主內容區塊的版面骨架
- View 切換（items / trash / settings）
- 串接資料層 hook（useItems）
- 將資料與事件處理交給子元件
- 避免把 IndexedDB/資料細節寫在 UI 中

目前功能例：
- Drawer 導航與控制中心雛形
- 回收桶/設定視圖切換
- 開啟/關閉 ItemDialog（新增/編輯）

---

### src/types/models.ts
範疇：領域模型（Domain Model）與型別契約
- 定義 SubscriptionItem 結構與欄位型態
- 定義 BillingCycle 等 enum-like 型別
- 作為 UI/資料層/匯入匯出共同依據，避免結構散落各處

目前功能例：
- 項目資料結構（名稱、金額、週期、日期、付款方式、標籤）
- 回收桶欄位（deletedAtISO / purgeAfterISO）

---

### src/state/useItems.ts
範疇：資料層（Data Layer）與本機持久化
- IndexedDB 開啟、讀寫、清空等封裝
- CRUD（新增/更新/軟刪除/還原/永久刪除）
- 回收桶策略（30 天後清除）
- 匯出/匯入（JSON 備份格式、版本號、覆蓋策略）
- 對外提供乾淨 API（activeItems / trashItems），讓 UI 不需要理解資料細節

目前功能例：
- exportBackup(): 產生 JSON payload
- importBackupReplace(): 覆蓋匯入
- 啟動時清除過期回收桶資料

---

### src/state/useSettings.ts
範疇：使用者偏好設定（Settings Data Layer）
- 統一管理「使用者偏好」的資料結構（Settings schema）
- 以 localStorage 持久化設定（跟瀏覽器 + origin 綁定）
- 提供型別安全的讀寫 API（例如 setThemeMode）
- 集中管理 localStorage key、預設值、容錯解析（避免亂值造成崩潰）
- 後續新增設定（預設排序、預設統計口徑、語系等）都應該擴充在此處

目前功能例：
- 淺/深色主題模式持久化
- 預設統計口徑 / 預設排序欄位（可先放 schema，之後接 UI）

---

### src/state/useViewState.ts
範疇：檢視狀態（View/UI State Layer）
- 管理「當下畫面如何呈現資料」的狀態，而不是資料本身
- 包含：目前 View（items/trash/settings）、Drawer 開關、統計口徑（月/年）、排序方式等
- 初始值可由 Settings（useSettings.ts）提供預設，但允許使用者在 Drawer 內隨時切換
- 內建「回復預設」能力：將當下檢視狀態回到 Settings 的預設值
- 避免 App.tsx 堆滿大量 useState，使 App.tsx 保持為「骨架與組裝」角色
- 排序狀態拆為 sortKey + sortOrder，在 UI 上也列為兩排。

目前功能例：
- view：items / trash / settings
- drawerOpen：功能選單開關
- viewMode：月/年統計口徑（初始值來自 settings.defaultViewMode，但可隨時切換）
- sortKey：排序鍵（初始值來自 settings.defaultSortKey，但可隨時切換）
- sortOrder：asc / desc（升冪/降冪）
- resetViewModeToDefault / resetSortToDefault：回復設定預設


---

### src/components/ItemDialog.tsx
範疇：項目表單 UI（新增/編輯）與輸入驗證
- 管理表單欄位 state（名稱、金額、日期、付款方式、標籤）
- 基礎驗證（必填、金額合法、日期順序）
- 不直接存 DB；透過 props 呼叫 onSubmit / onMoveToTrash

目前功能例：
- 新增/編輯共用對話框
- 進回收桶按鈕（由上層決定實際刪除策略）

---

### src/components/ItemCard.tsx
範疇：列表單筆呈現（純顯示）
- 呈現項目摘要資訊
- 點擊行為交給上層（onClick）
- 不處理資料讀寫，不維持業務狀態

目前功能例：
- 顯示名稱、換算後金額、日期、付款方式、標籤

---

### src/components/SettingsView.tsx
範疇：設定視圖內容（View 內容元件）
- 顯示儲存資訊（IndexedDB、本機、origin、DB/Store 名稱）
- 顯示資料筆數摘要
- 觸發主題切換、匯出/匯入（實際行為由上層提供）

目前功能例：
- 淺/深色主題切換入口
- 匯出/匯入按鈕（由 App.tsx 連接到 useItems）

---

### src/index.css / src/App.css
範疇：全域 CSS reset / 清理模板殘留
- 避免 Vite 模板的置中、max-width 等展示頁樣式干擾 App
- CSS 盡量少，視覺主要交給 MUI theme 與 sx

建議原則：
- index.css 保持 reset（body margin 等）
- App.css 可逐步移除模板殘留（.logo、.card 等）以維持乾淨

---

## 延伸功能的放置原則（之後新增時遵循）

- 搜尋/篩選/排序狀態：建議新增 src/state/useViewState.ts（或類似）集中管理
- 匯出/匯入策略擴充：仍放在 useItems.ts（Data Layer）
- 設定新增（例如貨幣、日期格式、預設排序）：建議由 main.tsx 或獨立 useSettings.ts 管理，並持久化到 localStorage
- 未來雲端同步：useItems.ts 可替換儲存實作（IndexedDB -> 雲端 + 本機快取），UI 不應大量修改

