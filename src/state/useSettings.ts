import * as React from "react";

export type ThemeMode = "light" | "dark";
export type DefaultViewMode = "monthly" | "yearly";
export type SortKey = "dueDate" | "amount" | "name";
export type SortOrder = "asc" | "desc";

export type SettingsV1 = {
  version: 1;

  // 外觀
  themeMode: ThemeMode;

  // 顯示相關偏好
  showWeekdayInDayPicker: boolean;
  statusWindowDays: number; // 低打擾狀態顯示
  alertDays: number; // 即將到期警示

  // 預設檢視
  defaultViewMode: DefaultViewMode;

  // 預設排序
  defaultSortKey: SortKey;
  defaultSortOrder: SortOrder;
};

const SETTINGS_KEY = "expenseCycle.settings";

const defaultSettings: SettingsV1 = {
  version: 1,
  themeMode: "light",

  showWeekdayInDayPicker: true,
  statusWindowDays: 7,
  alertDays: 3,

  defaultViewMode: "monthly",
  defaultSortKey: "dueDate",
  defaultSortOrder: "asc",
};

function clampReminderDays(n: number) {
  // -1 = 不顯示；其餘限制在 0~9
  if (!Number.isFinite(n)) return 0;
  const v = Math.trunc(n);
  if (v === -1) return -1;
  return Math.min(9, Math.max(0, v));
}

function loadSettings(): SettingsV1 {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;

    const parsed = JSON.parse(raw) as Partial<SettingsV1>;
    if (!parsed || parsed.version !== 1) return defaultSettings;

    return {
      ...defaultSettings,
      ...parsed,
      // 數字欄位做保護（避免 localStorage 被亂寫）
      statusWindowDays: clampReminderDays(Number(parsed.statusWindowDays ?? defaultSettings.statusWindowDays)),
      alertDays: clampReminderDays(Number(parsed.alertDays ?? defaultSettings.alertDays)),
      showWeekdayInDayPicker: Boolean(parsed.showWeekdayInDayPicker ?? defaultSettings.showWeekdayInDayPicker),
    };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(s: SettingsV1) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function useSettings() {
  const [settings, setSettings] = React.useState<SettingsV1>(() =>
    loadSettings()
  );

  function patch(next: Partial<SettingsV1>) {
    setSettings((prev) => {
      const merged: SettingsV1 = {
        ...prev,
        ...next,
        statusWindowDays: clampReminderDays(
          Number(next.statusWindowDays ?? prev.statusWindowDays)
        ),
        alertDays: clampReminderDays(
          Number(next.alertDays ?? prev.alertDays)
        ),
      };
      saveSettings(merged);
      return merged;
    });
  }

  const actions = React.useMemo(
    () => ({
      setThemeMode: (mode: ThemeMode) => patch({ themeMode: mode }),

      setShowWeekdayInDayPicker: (v: boolean) =>
        patch({ showWeekdayInDayPicker: v }),
      setStatusWindowDays: (days: number) => patch({ statusWindowDays: days }),
      setAlertDays: (days: number) => patch({ alertDays: days }),

      setDefaultViewMode: (mode: DefaultViewMode) =>
        patch({ defaultViewMode: mode }),
      setDefaultSortKey: (key: SortKey) => patch({ defaultSortKey: key }),
      setDefaultSortOrder: (order: SortOrder) =>
        patch({ defaultSortOrder: order }),
    }),
    []
  );

  return { settings, actions };
}