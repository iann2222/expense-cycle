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

function validateTagColors(raw: unknown): TagColors {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("備份內容格式錯誤（tagColors）");
  }

  const out: TagColors = {};
  for (const [tag, color] of Object.entries(raw)) {
    if (typeof color !== "string") {
      throw new Error(`備份內容格式錯誤（tagColors.${tag}）`);
    }
    out[tag] = color;
  }
  return out;
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

        const nextTagColors = validateTagColors(raw?.tagColors);
        const hasTagColors = raw?.tagColors !== undefined;

        await importBackupReplace(raw);

        // items 匯入成功後才更新 tagColors，避免失敗時留下部分匯入狀態。
        if (hasTagColors) replaceTagColors(nextTagColors);

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
