import * as React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type {
  DefaultViewMode,
  SortKey,
  SortOrder,
  ThemeMode,
} from "../state/useSettings";

export function SettingsView({
  themeMode,
  onToggleTheme,

  // 顯示相關偏好
  showWeekdayInDayPicker,
  onChangeShowWeekdayInDayPicker,
  statusWindowDays,
  onChangeStatusWindowDays,
  alertDays,
  onChangeAlertDays,

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
  statusWindowDays: number;
  onChangeStatusWindowDays: (n: number) => void;
  alertDays: number;
  onChangeAlertDays: (n: number) => void;

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
  const NO_SHOW = -1;
  const dayOptions = React.useMemo(() => Array.from({ length: 10 }, (_, i) => i), []); // 0~9
  const normalize = (n: number) => {
    // 允許 -1 (不顯示) 或 0~9
    if (n === NO_SHOW) return NO_SHOW;
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(9, Math.trunc(n)));
  };

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

      {/* 顯示相關偏好 */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">顯示相關偏好</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            設置日期選擇器與「即將到期」天數判定。
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={showWeekdayInDayPicker}
                  onChange={(e) => onChangeShowWeekdayInDayPicker(e.target.checked)}
                />
              }
              label="在「日」選單中顯示星期，如：2（一）。"
            />

            {/* 剩餘天數提示（溫和） */}
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2">剩餘天數提示（溫和）</Typography>
                <Typography variant="body2" color="text.secondary">
                  在距離截止日的指定天數內，會顯示剩餘天數提示。
                </Typography>
              </Box>

              <TextField
                select
                value={normalize(statusWindowDays)}
                onChange={(e) => onChangeStatusWindowDays(normalize(Number(e.target.value)))}
                size="small"
                sx={{ width: 140, flexShrink: 0, mt: 0.25 }}
              >
                <MenuItem value={NO_SHOW}>不顯示</MenuItem>
                {dayOptions.map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {/* 即將到期警示（強烈） */}
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2">即將到期警示（強烈）</Typography>
                <Typography variant="body2" color="text.secondary">
                  在距離截止日的指定天數內，會顯示標色的即將到期警示。
                </Typography>
              </Box>

              <TextField
                select
                value={normalize(alertDays)}
                onChange={(e) => onChangeAlertDays(normalize(Number(e.target.value)))}
                size="small"
                sx={{ width: 140, flexShrink: 0, mt: 0.25 }}
              >
                <MenuItem value={NO_SHOW}>不顯示</MenuItem>
                {dayOptions.map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* 預設檢視 */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">預設檢視</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            只影響每次打開 App 的初始狀態；仍可在左側選單隨時切換檢視與排序。
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* 預設排序 */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            預設排序
          </Typography>

          <Stack spacing={1}>
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

            <Stack direction="row" spacing={1}>
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
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* 預設統計口徑 */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            預設統計口徑
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button
              variant={defaultViewMode === "original" ? "contained" : "outlined"}
              onClick={() => onChangeDefaultViewMode("original")}
            >
              依原週期
            </Button>
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
        </CardContent>
      </Card>

      {/* 聲明 */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">聲明</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            時區限制：本應用目前只支援 UTC+8（Asia/Taipei）。如裝置時區不屬此時區，計算與顯示仍均以 UTC+8 為準。
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            週期限制：本應用目前只支援以月/年單位的週期。
          </Typography>
        </CardContent>
      </Card>

      {/* 資料 */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">資料</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            資料儲存在本機瀏覽器的 IndexedDB（依瀏覽器/網站來源而不同）。
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
              筆數：全部 {itemsCount.total}（使用中 {itemsCount.active} | 回收桶 {itemsCount.trash}）
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={onExport}>
              匯出
            </Button>
            <Button variant="outlined" onClick={onImportClick}>
              匯入（覆蓋）
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Box />
    </Stack>
  );
}
