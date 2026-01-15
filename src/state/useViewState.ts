import * as React from "react";
import type {
  DefaultViewMode,
  SortKey,
  SortOrder,
  SettingsV1,
} from "./useSettings";

export type View = "items" | "tags" | "analysis" | "settings" | "trash";

const EXIT_WINDOW_MS = 2000;
const HINT_AUTO_CLOSE_MS = 1800;

// 定義 History State 形狀，確保型別安全
type EcState =
  | { __ec: true; kind: "view"; view: View }
  | { __ec: true; kind: "guard"; view: "items" };

function makeViewState(view: View): EcState {
  return { __ec: true, kind: "view", view };
}
function makeGuardState(): EcState {
  return { __ec: true, kind: "guard", view: "items" };
}

// 判斷當前 state 是否為我們控制的
function isEcState(s: any): s is EcState {
  return !!s && s.__ec === true && (s.kind === "view" || s.kind === "guard");
}

export function useViewState(settings: SettingsV1) {
  const [view, setView] = React.useState<View>("items");
  const viewRef = React.useRef(view);
  // 同步 Ref 以便在 Event Listener 中讀取最新值
  React.useEffect(() => void (viewRef.current = view), [view]);

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const drawerOpenRef = React.useRef(drawerOpen);
  React.useEffect(() => void (drawerOpenRef.current = drawerOpen), [drawerOpen]);

  // 設定與篩選狀態
  const [viewMode, setViewMode] = React.useState<DefaultViewMode>(settings.defaultViewMode);
  const [sortKey, setSortKey] = React.useState<SortKey>(settings.defaultSortKey);
  const [sortOrder, setSortOrder] = React.useState<SortOrder>(settings.defaultSortOrder);
  const [searchText, setSearchText] = React.useState("");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);

  const viewModeTouchedRef = React.useRef(false);
  const sortTouchedRef = React.useRef(false);

  // ===== Back / history 控制核心 =====
  const internalNavRef = React.useRef(false);
  const allowExitOnceRef = React.useRef(false);
  const lastBackAtRef = React.useRef(0);
  const interactedRef = React.useRef(false);
  const guardReadyRef = React.useRef(false);

  const [backHintOpen, setBackHintOpen] = React.useState(false);
  const hintTimerRef = React.useRef<number | null>(null);

  // 初始化設定同步
  React.useEffect(() => {
    if (!viewModeTouchedRef.current) setViewMode(settings.defaultViewMode);
  }, [settings.defaultViewMode]);
  React.useEffect(() => {
    if (!sortTouchedRef.current) setSortKey(settings.defaultSortKey);
  }, [settings.defaultSortKey]);
  React.useEffect(() => {
    if (!sortTouchedRef.current) setSortOrder(settings.defaultSortOrder);
  }, [settings.defaultSortOrder]);

  // 提示視窗控制
  function closeBackHint() {
    setBackHintOpen(false);
    if (hintTimerRef.current != null) {
      window.clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
  }

  function showBackHint() {
    setBackHintOpen(true);
    if (hintTimerRef.current != null) window.clearTimeout(hintTimerRef.current);
    hintTimerRef.current = window.setTimeout(() => {
      setBackHintOpen(false);
      hintTimerRef.current = null;
    }, HINT_AUTO_CLOSE_MS);
  }

  // ✅ 核心修正：重建 Guard 邏輯拆分
  // 1. 初始化或強制重置時使用 (會取代當前並加一層)
  function rebuildItemsGuard() {
    window.history.replaceState(makeViewState("items"), "", window.location.href);
    window.history.pushState(makeGuardState(), "", window.location.href);
    guardReadyRef.current = true;
  }

  // 2. 單純補回 Guard (當瀏覽器已經 pop 掉一層時使用)
  function pushGuard() {
    window.history.pushState(makeGuardState(), "", window.location.href);
    guardReadyRef.current = true;
  }

  // 確保 Guard 存在 (懶加載策略)
  function ensureGuardReady() {
    if (typeof window === "undefined") return;
    if (!interactedRef.current) return;
    if (guardReadyRef.current) return;
    rebuildItemsGuard();
  }

  // 監聽使用者互動以啟用 History API (Chrome 限制)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const markInteracted = () => {
      if (interactedRef.current) return;
      interactedRef.current = true;
      ensureGuardReady();
    };
    window.addEventListener("pointerdown", markInteracted, { passive: true });
    window.addEventListener("touchstart", markInteracted, { passive: true });
    window.addEventListener("keydown", markInteracted);
    return () => {
      window.removeEventListener("pointerdown", markInteracted);
      window.removeEventListener("touchstart", markInteracted);
      window.removeEventListener("keydown", markInteracted);
    };
  }, []);

  // Drawer 控制
  function openDrawer() { setDrawerOpen(true); }
  function closeDrawer() { setDrawerOpen(false); }

  // ✅ 頁面導航邏輯
  function goTo(next: View) {
    setView(next);
    setDrawerOpen(false);

    if (typeof window === "undefined") return;
    if (!interactedRef.current) return;

    ensureGuardReady();

    if (next === "items") {
      // 回到首頁時，重置為乾淨的 [Items, Guard] 狀態
      // 注意：這會截斷在此之後的 history，符合 App 行為
      rebuildItemsGuard();
      return;
    }

    const cur = window.history.state;
    // 如果目前已經在內頁，切換到另一個內頁時使用 replace (保持 stack 深度不變)
    if (isEcState(cur) && cur.kind === "view" && cur.view !== "items") {
      window.history.replaceState(makeViewState(next), "", window.location.href);
    } else {
      // 從首頁(Guard) 進入內頁，使用 push (增加 stack 深度)
      window.history.pushState(makeViewState(next), "", window.location.href);
    }
  }

  function backToItems() {
    // 軟體介面上的「返回」按鈕行為
    // 這裡直接 rebuild 是安全的，因為這是主動導航，不是回應 popstate
    setView("items");
    if (interactedRef.current) rebuildItemsGuard();
  }

  // 其他 UI 邏輯
  function changeViewMode(mode: DefaultViewMode) { viewModeTouchedRef.current = true; setViewMode(mode); }
  function resetViewModeToDefault() { viewModeTouchedRef.current = false; setViewMode(settings.defaultViewMode); }
  function changeSortKey(key: SortKey) { sortTouchedRef.current = true; setSortKey(key); }
  function changeSortOrder(order: SortOrder) { sortTouchedRef.current = true; setSortOrder(order); }
  function resetSortToDefault() { sortTouchedRef.current = false; setSortKey(settings.defaultSortKey); setSortOrder(settings.defaultSortOrder); }
  function toggleTag(tag: string) { setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]); }
  function clearFilters() { setSearchText(""); setSelectedTags([]); }

  // ✅ 修正後的 Popstate 處理邏輯
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const resetAllowExitSoon = () => {
      window.setTimeout(() => { allowExitOnceRef.current = false; }, 0);
    };

    const onPopState = (_e: PopStateEvent) => {
      if (allowExitOnceRef.current) {
        resetAllowExitSoon();
        return;
      }
      if (!interactedRef.current) return;

      // 1. Drawer 開啟狀態：優先級最高
      // 瀏覽器行為：從 [Items, Guard] 退到 [Items]
      // 我們需要：關閉 Drawer，並把 Guard 補回去，回到 [Items, Guard]
      if (drawerOpenRef.current) {
        setDrawerOpen(false);
        pushGuard(); // ✅ 只補 Guard，不重建整個 stack
        return;
      }

      const v = viewRef.current;

      // 2. 非首頁狀態 (如 Settings, Analysis)
      // 瀏覽器行為：從 [..., Guard, Settings] 退到 [..., Guard]
      // 我們需要：切換 UI 到 Items，但 **不需要** 操作 history (因為已經在 Guard 了)
      if (v !== "items") {
        internalNavRef.current = true;
        setView("items");
        // ✅ 關鍵修正：這裡什麼都不做，因為我們已經自然落在 Guard state 上了
        return;
      }

      // 3. 首頁狀態 (Items + Guard)
      // 瀏覽器行為：從 [..., Items, Guard] 退到 [..., Items]
      const now = Date.now();
      const delta = now - lastBackAtRef.current;

      // 如果是短時間內第二次按 -> 真的退出
      if (delta <= EXIT_WINDOW_MS) {
        closeBackHint();
        allowExitOnceRef.current = true;
        window.history.back(); // 這裡會從 [Items] 退到更之前的 Entry，達成退出
        resetAllowExitSoon();
        return;
      }

      // 第一次按 -> 顯示提示並補回 Guard
      // 狀態變回 [..., Items, Guard] 以便攔截下一次
      lastBackAtRef.current = now;
      showBackHint();
      pushGuard(); // ✅ 只補 Guard
    };

    window.addEventListener("popstate", onPopState);

    const onPageShow = () => {
      allowExitOnceRef.current = false;
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return {
    view,
    drawerOpen,
    viewMode,
    sortKey,
    sortOrder,
    searchText,
    setSearchText,
    selectedTags,
    toggleTag,
    clearFilters,
    openDrawer,
    closeDrawer,
    goTo,
    backToItems,
    changeViewMode,
    resetViewModeToDefault,
    changeSortKey,
    changeSortOrder,
    resetSortToDefault,
    backHintOpen,
    closeBackHint,
  };
}