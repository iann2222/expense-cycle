import { useRef, useState } from "react";
import type { SettingsV1 } from "../state/useSettings";
import { SettingsView } from "../components/SettingsView";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

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

  // ✅ 讓 App 處理匯入
  onImportFile: (file: File) => void | Promise<void>;

  origin: string;
  dbName: string;
  storeName: string;
  itemsCount: { active: number; trash: number; total: number };
}) {
  // ✅ import confirm dialog state
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);

  // ✅ 為了能清掉 input value（避免同一檔案重選不觸發 onChange）
  const importInputRef = useRef<HTMLInputElement | null>(null);

  function closeImportConfirm() {
    setImportConfirmOpen(false);
    setPendingImportFile(null);
  }

  return (
    <>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          if (!file) return;

          setPendingImportFile(file);
          setImportConfirmOpen(true);

          // 先清空 input，避免後續選同一檔案不觸發 change
          e.target.value = "";
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
        onImportClick={() => importInputRef.current?.click()}
        origin={origin}
        dbName={dbName}
        storeName={storeName}
        itemsCount={itemsCount}
      />

      <Dialog open={importConfirmOpen} onClose={closeImportConfirm}>
        <DialogTitle>確認匯入並覆蓋</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ whiteSpace: "pre-line" }}>
            {`此操作會「覆蓋」目前裝置上的所有本機資料（包含全部項目、回收桶等）。
若尚未匯出檔案備份，則現有資料將全部遺失。

確定要匯入並覆蓋嗎？`}
          </DialogContentText>

          {pendingImportFile ? (
            <DialogContentText sx={{ mt: 1 }} color="text.secondary">
              匯入檔案：{pendingImportFile.name}
            </DialogContentText>
          ) : null}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeImportConfirm}>取消</Button>

          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!pendingImportFile) return;

              // 先關 dialog（避免匯入期間 UI 卡著）
              setImportConfirmOpen(false);

              await onImportFile(pendingImportFile);

              setPendingImportFile(null);
            }}
          >
            匯入並覆蓋
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
