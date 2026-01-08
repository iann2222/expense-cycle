import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import type { DefaultViewMode, SortKey, SortOrder } from "../state/useSettings";

function getBrowserLabel() {
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "Microsoft Edge";
  if (ua.includes("Chrome/")) return "Google Chrome / Chromium";
  if (ua.includes("Firefox/")) return "Mozilla Firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Apple Safari";
  return "Unknown Browser";
}

function sortKeyLabel(k: SortKey) {
  if (k === "dueDate") return "到期日";
  if (k === "amount") return "金額";
  return "名稱";
}

export function SettingsView({
  themeMode,
  onToggleTheme,

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
  themeMode: "light" | "dark";
  onToggleTheme: () => void;

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
    <Box>
      <Stack spacing={2}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">外觀</Typography>
            <Divider sx={{ my: 1.5 }} />

            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack>
                <Typography>主題</Typography>
                <Typography variant="body2" color="text.secondary">
                  {themeMode === "light" ? "淺色" : "深色"}
                </Typography>
              </Stack>
              <Switch checked={themeMode === "dark"} onChange={onToggleTheme} />
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">預設檢視</Typography>
            <Divider sx={{ my: 1.5 }} />

            <Typography variant="body2" color="text.secondary">
              只影響「每次打開 App 的初始狀態」。你仍可在左側選單隨時切換檢視與排序。
            </Typography>

            <Stack spacing={2} sx={{ mt: 2 }}>
              <Box>
                <Typography variant="subtitle2">預設統計口徑</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Chip
                    label="月"
                    clickable
                    color={defaultViewMode === "monthly" ? "primary" : "default"}
                    variant={defaultViewMode === "monthly" ? "filled" : "outlined"}
                    onClick={() => onChangeDefaultViewMode("monthly")}
                  />
                  <Chip
                    label="年"
                    clickable
                    color={defaultViewMode === "yearly" ? "primary" : "default"}
                    variant={defaultViewMode === "yearly" ? "filled" : "outlined"}
                    onClick={() => onChangeDefaultViewMode("yearly")}
                  />
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle2">預設排序</Typography>

                {/* 第一排：排序依據 */}
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                  {(["dueDate", "amount", "name"] as const).map((k) => (
                    <Chip
                      key={k}
                      label={sortKeyLabel(k)}
                      clickable
                      color={defaultSortKey === k ? "primary" : "default"}
                      variant={defaultSortKey === k ? "filled" : "outlined"}
                      onClick={() => onChangeDefaultSortKey(k)}
                    />
                  ))}
                </Stack>

                {/* 第二排：升冪/降冪 */}
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Chip
                    label="小 → 大"
                    clickable
                    color={defaultSortOrder === "asc" ? "primary" : "default"}
                    variant={defaultSortOrder === "asc" ? "filled" : "outlined"}
                    onClick={() => onChangeDefaultSortOrder("asc")}
                  />
                  <Chip
                    label="大 → 小"
                    clickable
                    color={defaultSortOrder === "desc" ? "primary" : "default"}
                    variant={defaultSortOrder === "desc" ? "filled" : "outlined"}
                    onClick={() => onChangeDefaultSortOrder("desc")}
                  />
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">資料</Typography>
            <Divider sx={{ my: 1.5 }} />

            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                儲存方式：IndexedDB（本機，跟瀏覽器走）
              </Typography>
              <Typography variant="body2" color="text.secondary">
                瀏覽器：{getBrowserLabel()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                網站來源（Origin）：{origin}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                DB：{dbName} / Store：{storeName}
              </Typography>

              <Divider sx={{ my: 1 }} />

              <Typography variant="body2">
                目前筆數：全部 {itemsCount.total}（正常 {itemsCount.active} / 回收桶{" "}
                {itemsCount.trash}）
              </Typography>

              <Typography variant="body2" color="text.secondary">
                注意：清除瀏覽器的「網站資料」可能會刪掉本機資料。
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">備份</Typography>
            <Divider sx={{ my: 1.5 }} />

            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              <Button variant="outlined" onClick={onExport}>
                匯出備份（JSON）
              </Button>
              <Button variant="outlined" onClick={onImportClick}>
                匯入備份（JSON）
              </Button>
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              匯入會「覆蓋」本機現有資料（避免合併策略造成混亂）。
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
