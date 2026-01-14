import * as React from "react";
import type {
  DefaultViewMode,
  SortKey,
  SortOrder,
  SettingsV1,
} from "./useSettings";

export type View = "items" | "tags" | "analysis" | "settings" | "trash";

const EXIT_WINDOW_MS = 2000;

export function useViewState(settings: SettingsV1) {
  const [view, setView] = React.useState<View>("items");
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // 檢視控制（初始值取自 settings）
  const [viewMode, setViewMode] = React.useState<DefaultViewMode>(
    settings.defaultViewMode
  );

  const [sortKey, setSortKey] = React.useState<SortKey>(
    settings.defaultSortKey
  );
  const [sortOrder, setSortOrder] = React.useState<SortOrder>(
    settings.defaultSortOrder
  );

  // 搜尋/篩選（只用在 items 視圖）
  const [searchText, setSearchText] = React.useState("");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);

  const viewModeTouchedRef = React.useRef(false);
  const sortTouchedRef = React.useRef(false);

  // ===== Android PWA back / history =====
  const internalNavRef = React.useRef(false); // 避免 popstate 導航造成 pushState 迴圈
  const lastBackAtRef = React.useRef<number>(0);
  const [backHintOpen, setBackHintOpen] = React.useState(false);

  React.useEffect(() => {
    if (!viewModeTouchedRef.current) setViewMode(settings.defaultViewMode);
  }, [settings.defaultViewMode]);

  React.useEffect(() => {
    if (!sortTouchedRef.current) setSortKey(settings.defaultSortKey);
  }, [settings.defaultSortKey]);

  React.useEffect(() => {
    if (!sortTouchedRef.current) setSortOrder(settings.defaultSortOrder);
  }, [settings.defaultSortOrder]);

  function openDrawer() {
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function goTo(next: View) {
    setView(next);
    closeDrawer();
  }

  function backToItems() {
    setView("items");
  }

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
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      return [...prev, tag];
    });
  }

  function clearFilters() {
    setSearchText("");
    setSelectedTags([]);
  }

  function closeBackHint() {
    setBackHintOpen(false);
  }

  /**
   * view 變更時同步 pushState：
   * - 讓 Android 返回鍵（popstate）能知道目前在 app 內的哪個 view
   * - 但若這次 view 變更是「popstate 導致的內部導覽」，就不要再 push，避免迴圈
   */
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if (internalNavRef.current) {
      internalNavRef.current = false;
      return;
    }

    window.history.pushState({ __ec: true, view }, "", window.location.href);
  }, [view]);

  /**
   * Android Chrome PWA（standalone）返回鍵處理（穩定版）
   *
   * 背景：在 PWA standalone 首頁，初始 history stack 常常無法靠 mount 時 pushState 建立「可攔截層」。
   * 所以採用實務上最穩的策略：
   * - 非首頁：返回鍵先回首頁，並 push 一層把使用者留在 App
   * - 首頁：第一次返回 → 顯示提示 + pushState 把使用者留在 App
   *         第二次（2 秒內）→ 不 push，讓系統真的退出 App
   */
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    function onPopState(_e: PopStateEvent) {
      // 關 drawer（避免視覺卡住）
      setDrawerOpen(false);

      // 非首頁（含 tags/analysis/settings/trash）：返回鍵 → 回首頁並補一層 history
      if (view !== "items") {
        internalNavRef.current = true;
        setView("items");

        window.history.pushState(
          { __ec: true, view: "items" },
          "",
          window.location.href
        );
        return;
      }

      // ===== 以下只處理「首頁 items」 =====
      const now = Date.now();
      const delta = now - lastBackAtRef.current;

      // 第二次返回（在窗口期內）：不再補 history，讓系統退出 PWA
      if (delta <= EXIT_WINDOW_MS) {
        return;
      }

      // 第一次返回：提示 + 補一層 history，把使用者留在 App
      lastBackAtRef.current = now;
      setBackHintOpen(true);

      window.history.pushState(
        { __ec: true, view: "items" },
        "",
        window.location.href
      );
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [view]);

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

    // Android 返回鍵提示用
    backHintOpen,
    closeBackHint,
  };
}
