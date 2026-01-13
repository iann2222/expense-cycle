import { useCallback, useState } from "react";
import type { TagColors } from "../components/TagsView";

type ImportResult = {
  open: boolean;
  success: boolean;
  message: string;
};

function defaultResult(): ImportResult {
  return { open: false, success: true, message: "" };
}

export function useBackup(args: {
  exportBackup: () => any;
  importBackupReplace: (raw: any) => Promise<void>;

  tagColors: TagColors;
  replaceTagColors: (next: TagColors) => void;

  onImportDone?: () => void;
}) {
  const { exportBackup, importBackupReplace, tagColors, replaceTagColors, onImportDone } = args;

  const [result, setResult] = useState<ImportResult>(defaultResult);

  const closeResult = useCallback(() => {
    setResult((p) => ({ ...p, open: false }));
  }, []);

  const exportToFile = useCallback(() => {
    const payload = exportBackup();
    const wrapped = { ...payload, tagColors };

    const blob = new Blob([JSON.stringify(wrapped, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-cycle-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }, [exportBackup, tagColors]);

  const importFromFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();

        let raw: any;
        try {
          raw = JSON.parse(text);
        } catch {
          setResult({
            open: true,
            success: false,
            message: "匯入失敗：不是有效的 JSON",
          });
          return;
        }

        // tagColors（如果檔案內有就更新）
        if (raw?.tagColors && typeof raw.tagColors === "object") {
          replaceTagColors(raw.tagColors as TagColors);
        }

        await importBackupReplace(raw);

        setResult({
          open: true,
          success: true,
          message: "匯入完成（已覆蓋本機資料）",
        });

        onImportDone?.();
      } catch (e) {
        setResult({
          open: true,
          success: false,
          message: `匯入失敗：${e instanceof Error ? e.message : String(e)}`,
        });
      }
    },
    [importBackupReplace, replaceTagColors, onImportDone]
  );

  return {
    exportToFile,
    importFromFile,
    result,
    closeResult,
  };
}
