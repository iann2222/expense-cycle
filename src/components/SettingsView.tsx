import * as React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import type { DefaultViewMode, SortKey, SortOrder, ThemeMode } from "../state/useSettings";

export function SettingsView({
  themeMode,
  onToggleTheme,

  showWeekdayInDayPicker,
  onChangeShowWeekdayInDayPicker,

  defaultViewMode,
  onChangeDefaultViewMode,

  defaultSortKey,
  onChangeDefaultSortKey,
  defaultSortOrder,
  onChangeDefaultSortOrder,

  onExport,
  onImportClick,

  origin,
  dbName,
  storeName,
  itemsCount,
}: {
  themeMode: ThemeMode;
  onToggleTheme: () => void;

  showWeekdayInDayPicker: boolean;
  onChangeShowWeekdayInDayPicker: (v: boolean) => void;

  defaultViewMode: DefaultViewMode;
  onChangeDefaultViewMode: (mode: DefaultViewMode) => void;

  defaultSortKey: SortKey;
  onChangeDefaultSortKey: (key: SortKey) => void;
  defaultSortOrder: SortOrder;
  onChangeDefaultSortOrder: (order: SortOrder) => void;

  onExport: () => void;
  onImportClick: () => void;

  origin: string;
  dbName: string;
  storeName: string;
  itemsCount: { active: number; trash: number; total: number };
}) {
  return (
    <Stack spacing={2}>
      {/* 外觀 */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">外觀</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            調整主題顏色偏好。
          </Typography>

          <Divider sx={{ my: 2 }} />

          <FormControlLabel
            control={<Switch checked={themeMode === "dark"} onChange={onToggleTheme} />}
            label={themeMode === "dark" ? "深色主題" : "淺色主題"}
          />
        </CardContent>
      </Card>

      {/* ✅ 你指定的獨立區塊：日期選擇器（放在外觀、預設檢視之間） */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">日期選擇器</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            控制日期下拉選單的顯示方式。
          </Typography>

          <Divider sx={{ my: 2 }} />

          <FormControlLabel
            control={
              <Switch
                checked={showWeekdayInDayPicker}
                onChange={(e) => onChangeShowWeekdayInDayPicker(e.target.checked)}
              />
            }
            label="在「日」選單中顯示星期，例如：2（一）"
          />
        </CardContent>
      </Card>

      {/* 預設檢視 */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">預設檢視</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            只影響每次打開 App 的初始狀態；你仍可在左側選單隨時切換檢視與排序。
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            預設統計口徑
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button
              variant={defaultViewMode === "monthly" ? "contained" : "outlined"}
              onClick={() => onChangeDefaultViewMode("monthly")}
            >
              月
            </Button>
            <Button
              variant={defaultViewMode === "yearly" ? "contained" : "outlined"}
              onClick={() => onChangeDefaultViewMode("yearly")}
            >
              年
            </Button>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            預設排序
          </Typography>

          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Button
              variant={defaultSortKey === "dueDate" ? "contained" : "outlined"}
              onClick={() => onChangeDefaultSortKey("dueDate")}
            >
              到期日
            </Button>
            <Button
              variant={defaultSortKey === "amount" ? "contained" : "outlined"}
              onClick={() => onChangeDefaultSortKey("amount")}
            >
              金額
            </Button>
            <Button
              variant={defaultSortKey === "name" ? "contained" : "outlined"}
              onClick={() => onChangeDefaultSortKey("name")}
            >
              名稱
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button
              variant={defaultSortOrder === "asc" ? "contained" : "outlined"}
              onClick={() => onChangeDefaultSortOrder("asc")}
            >
              小 → 大
            </Button>
            <Button
              variant={defaultSortOrder === "desc" ? "contained" : "outlined"}
              onClick={() => onChangeDefaultSortOrder("desc")}
            >
              大 → 小
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* 資料 */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">資料</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            你的資料儲存在本機瀏覽器的 IndexedDB（依瀏覽器/網站來源而不同）。
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" color="text.secondary">
            來源：{origin}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            IndexedDB：{dbName} / {storeName}
          </Typography>

          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              筆數：全部 {itemsCount.total}（使用中 {itemsCount.active} / 回收桶 {itemsCount.trash}）
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={onExport}>
              匯出（JSON）
            </Button>
            <Button variant="outlined" onClick={onImportClick}>
              匯入（覆蓋）
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
