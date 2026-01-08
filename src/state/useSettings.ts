import * as React from "react";

export type ThemeMode = "light" | "dark";
export type DefaultViewMode = "monthly" | "yearly";

export type SortKey = "dueDate" | "amount" | "name";
export type SortOrder = "asc" | "desc";

export type SettingsV1 = {
  version: 1;
  themeMode: ThemeMode;

  // App 開啟預設值（可在 Drawer 暫時切換）
  defaultViewMode: DefaultViewMode;
  defaultSortKey: SortKey;
  defaultSortOrder: SortOrder;
  
  showWeekdayInDayPicker: boolean;
};

const STORAGE_KEY = "expenseCycle.settings";

const DEFAULT_SETTINGS: SettingsV1 = {
  version: 1,
  themeMode: "light",
  defaultViewMode: "monthly",
  defaultSortKey: "dueDate",
  defaultSortOrder: "asc",
  showWeekdayInDayPicker: true,
};

function coerceSettings(raw: unknown): SettingsV1 {
  // 向下相容：舊版沒有 showWeekdayInDayPicker
  const obj = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;

  const themeMode: ThemeMode = obj.themeMode === "dark" ? "dark" : "light";

  const defaultViewMode: DefaultViewMode =
    obj.defaultViewMode === "yearly" ? "yearly" : "monthly";

  const defaultSortKey: SortKey =
    obj.defaultSortKey === "amount"
      ? "amount"
      : obj.defaultSortKey === "name"
      ? "name"
      : "dueDate";

  const defaultSortOrder: SortOrder = obj.defaultSortOrder === "desc" ? "desc" : "asc";

  const showWeekdayInDayPicker =
    typeof obj.showWeekdayInDayPicker === "boolean" ? obj.showWeekdayInDayPicker : true;

  return {
    ...DEFAULT_SETTINGS,
    themeMode,
    defaultViewMode,
    defaultSortKey,
    defaultSortOrder,
    showWeekdayInDayPicker,
  };
}

function loadSettings(): SettingsV1 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return coerceSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: SettingsV1) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function useSettings() {
  const [settings, setSettings] = React.useState<SettingsV1>(() => loadSettings());

  function update(partial: Partial<SettingsV1>) {
    setSettings((prev) => {
      const next = coerceSettings({ ...prev, ...partial });
      saveSettings(next);
      return next;
    });
  }

  const actions = React.useMemo(
    () => ({
      setThemeMode: (mode: ThemeMode) => update({ themeMode: mode }),
      setDefaultViewMode: (mode: DefaultViewMode) => update({ defaultViewMode: mode }),
      setDefaultSortKey: (key: SortKey) => update({ defaultSortKey: key }),
      setDefaultSortOrder: (order: SortOrder) => update({ defaultSortOrder: order }),
      setShowWeekdayInDayPicker: (v: boolean) => update({ showWeekdayInDayPicker: v }),
    }),
    []
  );

  return { settings, actions };
}
