import * as React from "react";

export type ThemeMode = "light" | "dark";
export type DefaultViewMode = "monthly" | "yearly";
export type SortKey = "dueDate" | "amount" | "name";
export type SortOrder = "asc" | "desc";

export type SettingsV1 = {
  version: 1;
  themeMode: ThemeMode;
  defaultViewMode: DefaultViewMode;
  defaultSortKey: SortKey;
  defaultSortOrder: SortOrder;
};

const STORAGE_KEY = "expenseCycle.settings";

const DEFAULT_SETTINGS: SettingsV1 = {
  version: 1,
  themeMode: "light",
  defaultViewMode: "monthly",
  defaultSortKey: "dueDate",
  defaultSortOrder: "asc",
};

function isThemeMode(x: unknown): x is ThemeMode {
  return x === "light" || x === "dark";
}
function isDefaultViewMode(x: unknown): x is DefaultViewMode {
  return x === "monthly" || x === "yearly";
}
function isSortKey(x: unknown): x is SortKey {
  return x === "dueDate" || x === "amount" || x === "name";
}

function isSortOrder(x: unknown): x is SortOrder {
  return x === "asc" || x === "desc";
}

function parseSettings(raw: string | null): SettingsV1 {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const obj = JSON.parse(raw) as Partial<SettingsV1>;
    // v1：逐欄位驗證 + fallback（避免 localStorage 有怪值造成崩潰）
    return {
      version: 1,
      themeMode: isThemeMode(obj.themeMode) ? obj.themeMode : DEFAULT_SETTINGS.themeMode,
      defaultViewMode: isDefaultViewMode(obj.defaultViewMode)
        ? obj.defaultViewMode
        : DEFAULT_SETTINGS.defaultViewMode,
      defaultSortKey: isSortKey(obj.defaultSortKey)
        ? obj.defaultSortKey
        : DEFAULT_SETTINGS.defaultSortKey,
      defaultSortOrder: isSortOrder(obj.defaultSortOrder)
        ? obj.defaultSortOrder
        : DEFAULT_SETTINGS.defaultSortOrder,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = React.useState<SettingsV1>(() =>
    parseSettings(localStorage.getItem(STORAGE_KEY))
  );

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  function setThemeMode(mode: ThemeMode) {
    setSettings((prev) => ({ ...prev, themeMode: mode }));
  }

  function setDefaultViewMode(mode: DefaultViewMode) {
    setSettings((prev) => ({ ...prev, defaultViewMode: mode }));
  }

  function setDefaultSortKey(key: SortKey) {
    setSettings((prev) => ({ ...prev, defaultSortKey: key }));
  }

  function resetSettings() {
    setSettings(DEFAULT_SETTINGS);
  }

  function setDefaultSortOrder(order: SortOrder) {
    setSettings((prev) => ({ ...prev, defaultSortOrder: order }));
  }

  return {
    settings,
    setThemeMode,
    setDefaultViewMode,
    setDefaultSortKey,
    resetSettings,
    setDefaultSortOrder,
  };
}
