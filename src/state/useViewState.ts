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
  React.useEffect(() => void (viewRef.current = view), [view]);

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const drawerOpenRef = React.useRef(drawerOpen);
  React.useEffect(() => void (drawerOpenRef.current = drawerOpen), [drawerOpen]);

  // 設定與篩選狀態
  const [viewMode, setViewMode] = React.useState<DefaultViewMode>(
    settings.defaultViewMode
  );
  const [sortKey, setSortKey] = React.useState<SortKey>(settings.defaultSortKey);
  const [sortOrder, setSortOrder] = React.useState<SortOrder>(
    settings.defaultSortOrder
  );
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

  function rebuildItemsGuard() {
    window.history.replaceState(makeViewState("items"), "", window.location.href);
    window.history.pushState(makeGuardState(), "", window.location.href);
    guardReadyRef.current = true;
  }

  function pushGuard() {
    window.history.pushState(makeGuardState(), "", window.location.href);
    guardReadyRef.current = true;
  }

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
  function openDrawer() {
    setDrawerOpen(true);
  }
  function closeDrawer() {
    setDrawerOpen(false);
  }

  function goTo(next: View) {
    setView(next);
    setDrawerOpen(false);

    if (typeof window === "undefined") return;
    if (!interactedRef.current) return;

    ensureGuardReady();

    if (next === "items") {
      rebuildItemsGuard();
      return;
    }

    const cur = window.history.state;
    if (isEcState(cur) && cur.kind === "view" && cur.view !== "items") {
      window.history.replaceState(makeViewState(next), "", window.location.href);
    } else {
      window.history.pushState(makeViewState(next), "", window.location.href);
    }
  }

  function backToItems() {
    setView("items");
    if (interactedRef.current) rebuildItemsGuard();
  }

  // 其他 UI 邏輯
  function changeViewMode(mode: DefaultViewMode) {
    viewModeTouchedRef.current = true;
    setViewMode(mode);
  }
  function resetViewModeToDefault() {
    viewModeTouchedRef.current = false;
    setViewMode(settings.defaultViewMode);
  }
  function changeSortKey(key: SortKey) {
    sortTouchedRef.current = true;
    setSortKey(key);
  }
  function changeSortOrder(order: SortOrder) {
    sortTouchedRef.current = true;
    setSortOrder(order);
  }
  function resetSortToDefault() {
    sortTouchedRef.current = false;
    setSortKey(settings.defaultSortKey);
    setSortOrder(settings.defaultSortOrder);
  }
  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }
  function clearFilters() {
    setSearchText("");
    setSelectedTags([]);
  }

  // ✅ 修正後的 Popstate 處理邏輯（關鍵：讓 Modal 有機會先吃掉 popstate）
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const resetAllowExitSoon = () => {
      window.setTimeout(() => {
        allowExitOnceRef.current = false;
      }, 0);
    };

    const onPopState = (_e: PopStateEvent) => {
      const w = window as any;

      // ✅ 如果這次 popstate 已被 modal 吃掉（modal listener 先執行）
      if (w.__EC_MODAL_HANDLED) {
        w.__EC_MODAL_HANDLED = false;
        return;
      }

      // 你原本的放行退出邏輯（第二次 back 讓它真的離開）
      if (allowExitOnceRef.current) {
        resetAllowExitSoon();
        return;
      }

      if (!interactedRef.current) return;

      // ✅ 關鍵：延後一個 tick 再跑你的既有邏輯
      // 目的：讓「最上層 Dialog/Modal」有機會先處理 popstate
      window.setTimeout(() => {
        const w2 = window as any;

        // ✅ 如果 modal listener 後執行（useViewState 先接到），這裡就會看見 flag
        if (w2.__EC_MODAL_HANDLED) {
          w2.__EC_MODAL_HANDLED = false;
          return;
        }

        // 1) Drawer 開啟：返回鍵先關 Drawer，並補 Guard 回來
        if (drawerOpenRef.current) {
          setDrawerOpen(false);
          pushGuard();
          return;
        }

        const v = viewRef.current;

        // 2) 非首頁：返回鍵先回首頁（不動 history，因為此時已經落在 Guard 上）
        if (v !== "items") {
          internalNavRef.current = true;
          setView("items");
          return;
        }

        // 3) 首頁：雙擊退出
        const now = Date.now();
        const delta = now - lastBackAtRef.current;

        if (delta <= EXIT_WINDOW_MS) {
          closeBackHint();
          allowExitOnceRef.current = true;
          window.history.back(); // 放行：真正離開 standalone PWA / 回上一層
          resetAllowExitSoon();
          return;
        }

        // 第一次 back：提示 + 補 Guard（避免直接退出）
        lastBackAtRef.current = now;
        showBackHint();
        pushGuard();
      }, 0);
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
