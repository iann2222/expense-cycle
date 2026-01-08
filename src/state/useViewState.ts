import * as React from "react";
import type { DefaultViewMode, SortKey, SortOrder, SettingsV1 } from "./useSettings";

export type View = "items" | "trash" | "settings";

export function useViewState(settings: SettingsV1) {
  const [view, setView] = React.useState<View>("items");
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const [viewMode, setViewMode] = React.useState<DefaultViewMode>(settings.defaultViewMode);

  const [sortKey, setSortKey] = React.useState<SortKey>(settings.defaultSortKey);
  const [sortOrder, setSortOrder] = React.useState<SortOrder>(settings.defaultSortOrder);

  const viewModeTouchedRef = React.useRef(false);
  const sortTouchedRef = React.useRef(false);

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

  return {
    view,
    drawerOpen,
    viewMode,
    sortKey,
    sortOrder,

    openDrawer,
    closeDrawer,
    goTo,
    backToItems,

    changeViewMode,
    resetViewModeToDefault,

    changeSortKey,
    changeSortOrder,
    resetSortToDefault,
  };
}
