import { useRef } from "react";
import type { SettingsV1 } from "../state/useSettings";
import { SettingsView } from "../components/SettingsView";

export function SettingsPage({
  settings,
  actions,
  onExport,
  onImportFile,
  origin,
  dbName,
  storeName,
  itemsCount,
}: {
  settings: SettingsV1;
  actions: {
    setThemeMode: (mode: SettingsV1["themeMode"]) => void;

    setShowWeekdayInDayPicker: (v: boolean) => void;
    setStatusWindowDays: (days: number) => void;
    setAlertDays: (days: number) => void;

    setDefaultViewMode: (mode: SettingsV1["defaultViewMode"]) => void;
    setDefaultSortKey: (key: SettingsV1["defaultSortKey"]) => void;
    setDefaultSortOrder: (order: SettingsV1["defaultSortOrder"]) => void;
  };

  // ✅ 這裡改成 void：按一下就下載
  onExport: () => void;

  // ✅ 讓 App 處理匯入（你本來就是這樣）
  onImportFile: (file: File) => void | Promise<void>;

  origin: string;
  dbName: string;
  storeName: string;
  itemsCount: { active: number; trash: number; total: number };
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          void onImportFile(file);
          e.currentTarget.value = "";
        }}
      />

      <SettingsView
        themeMode={settings.themeMode}
        onToggleTheme={() =>
          actions.setThemeMode(
            settings.themeMode === "light" ? "dark" : "light"
          )
        }
        showWeekdayInDayPicker={settings.showWeekdayInDayPicker}
        onChangeShowWeekdayInDayPicker={actions.setShowWeekdayInDayPicker}
        statusWindowDays={settings.statusWindowDays}
        onChangeStatusWindowDays={actions.setStatusWindowDays}
        alertDays={settings.alertDays}
        onChangeAlertDays={actions.setAlertDays}
        defaultViewMode={settings.defaultViewMode}
        onChangeDefaultViewMode={actions.setDefaultViewMode}
        defaultSortKey={settings.defaultSortKey}
        onChangeDefaultSortKey={actions.setDefaultSortKey}
        defaultSortOrder={settings.defaultSortOrder}
        onChangeDefaultSortOrder={actions.setDefaultSortOrder}
        onExport={onExport}
        onImportClick={() => fileInputRef.current?.click()}
        origin={origin}
        dbName={dbName}
        storeName={storeName}
        itemsCount={itemsCount}
      />
    </>
  );
}
