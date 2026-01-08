import { useMemo, useRef, useState } from "react";
import type { SubscriptionItem } from "./types/models";
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Drawer,
  Fab,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import SettingsIcon from "@mui/icons-material/Settings";

import { useItems, DB_NAME, STORE_NAME, type BackupPayload } from "./state/useItems";
import type {
  SettingsV1,
  ThemeMode,
  DefaultViewMode,
  SortKey,
  SortOrder,
} from "./state/useSettings";
import { useViewState } from "./state/useViewState";

import { ItemCard } from "./components/ItemCard";
import { ItemDialog } from "./components/ItemDialog";
import { SettingsView } from "./components/SettingsView";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function toMonthlyAmount(item: SubscriptionItem) {
  return item.cycle === "monthly" ? item.amount : item.amount / 12;
}

function toYearlyAmount(item: SubscriptionItem) {
  return item.cycle === "yearly" ? item.amount : item.amount * 12;
}

function compareItems(a: SubscriptionItem, b: SubscriptionItem, key: SortKey, order: SortOrder) {
  let result = 0;
  if (key === "dueDate") result = a.dueDateISO.localeCompare(b.dueDateISO);
  else if (key === "amount") result = a.amount - b.amount;
  else result = a.name.localeCompare(b.name, "zh-Hant");

  return order === "asc" ? result : -result;
}

export default function App({
  settings,
  actions,
}: {
  settings: SettingsV1;
  actions: {
    setThemeMode: (mode: ThemeMode) => void;
    setDefaultViewMode: (mode: DefaultViewMode) => void;
    setDefaultSortKey: (key: SortKey) => void;
    setDefaultSortOrder: (order: SortOrder) => void;
  };
}) {
  const {
    loading,
    items,
    activeItems,
    trashItems,
    add,
    update,
    softDelete,
    restore,
    removeForever,
    exportBackup,
    importBackupReplace,
  } = useItems();

  const vs = useViewState(settings);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionItem | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const total = useMemo(() => {
    return Math.round(
      activeItems.reduce(
        (acc, it) => acc + (vs.viewMode === "monthly" ? toMonthlyAmount(it) : toYearlyAmount(it)),
        0
      )
    );
  }, [activeItems, vs.viewMode]);

  function handleExport() {
    const payload = exportBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-cycle-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    let payload: BackupPayload;

    try {
      payload = JSON.parse(text);
    } catch {
      alert("匯入失敗：不是有效的 JSON");
      return;
    }

    try {
      await importBackupReplace(payload);
      alert("匯入完成（已覆蓋本機資料）");
      vs.backToItems();
    } catch (e) {
      alert(`匯入失敗：${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const titleSuffix =
    vs.view === "trash" ? "（回收桶）" : vs.view === "settings" ? "（設定）" : "";

  return (
    <>
      <AppBar position="fixed" elevation={0}>
        <Toolbar>
          <IconButton
            edge="start"
            sx={{ mr: 1 }}
            onClick={() => {
              if (vs.view !== "items") {
                vs.backToItems();
                return;
              }
              vs.openDrawer();
            }}
          >
            {vs.view !== "items" ? <ArrowBackIcon /> : <MenuIcon />}
          </IconButton>

          <Typography
            variant="h6"
            sx={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}
          >
            ExpenseCycle{titleSuffix}
          </Typography>
        </Toolbar>
      </AppBar>

      <Toolbar />

      <Drawer open={vs.drawerOpen} onClose={vs.closeDrawer}>
        <Box sx={{ width: 280, display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1">功能</Typography>
            <Typography variant="body2" color="text.secondary">
              搜尋 / 篩選（下一步放這裡）
            </Typography>
          </Box>

          <Divider />

          <List>
            <ListItemButton selected={vs.view === "items"} onClick={() => vs.goTo("items")}>
              <ListItemText primary="全部項目" />
            </ListItemButton>

            <ListItemButton selected={vs.view === "settings"} onClick={() => vs.goTo("settings")}>
              <SettingsIcon fontSize="small" style={{ marginRight: 12 }} />
              <ListItemText primary="設定" />
            </ListItemButton>
          </List>

          <Box sx={{ px: 2, pb: 2 }}>
            <Typography variant="overline" color="text.secondary">
              統計口徑
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip
                label="月"
                clickable
                color={vs.viewMode === "monthly" ? "primary" : "default"}
                variant={vs.viewMode === "monthly" ? "filled" : "outlined"}
                onClick={() => vs.changeViewMode("monthly")}
              />
              <Chip
                label="年"
                clickable
                color={vs.viewMode === "yearly" ? "primary" : "default"}
                variant={vs.viewMode === "yearly" ? "filled" : "outlined"}
                onClick={() => vs.changeViewMode("yearly")}
              />
            </Stack>

            <Button
              size="small"
              sx={{ mt: 1, px: 0, justifyContent: "flex-start" }}
              onClick={vs.resetViewModeToDefault}
            >
              回復預設
            </Button>
          </Box>

          <Divider />

          <Box sx={{ px: 2, pb: 2 }}>
            <Typography variant="overline" color="text.secondary">
              排序
            </Typography>

            {/* 第一排：排序依據 */}
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
              <Chip
                label="到期日"
                clickable
                color={vs.sortKey === "dueDate" ? "primary" : "default"}
                variant={vs.sortKey === "dueDate" ? "filled" : "outlined"}
                onClick={() => vs.changeSortKey("dueDate")}
              />
              <Chip
                label="金額"
                clickable
                color={vs.sortKey === "amount" ? "primary" : "default"}
                variant={vs.sortKey === "amount" ? "filled" : "outlined"}
                onClick={() => vs.changeSortKey("amount")}
              />
              <Chip
                label="名稱"
                clickable
                color={vs.sortKey === "name" ? "primary" : "default"}
                variant={vs.sortKey === "name" ? "filled" : "outlined"}
                onClick={() => vs.changeSortKey("name")}
              />
            </Stack>

            {/* 第二排：升冪/降冪 */}
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip
                label="小 → 大"
                clickable
                color={vs.sortOrder === "asc" ? "primary" : "default"}
                variant={vs.sortOrder === "asc" ? "filled" : "outlined"}
                onClick={() => vs.changeSortOrder("asc")}
              />
              <Chip
                label="大 → 小"
                clickable
                color={vs.sortOrder === "desc" ? "primary" : "default"}
                variant={vs.sortOrder === "desc" ? "filled" : "outlined"}
                onClick={() => vs.changeSortOrder("desc")}
              />
            </Stack>

            <Button
              size="small"
              sx={{ mt: 1, px: 0, justifyContent: "flex-start" }}
              onClick={vs.resetSortToDefault}
            >
              回復預設
            </Button>
          </Box>

          <Box sx={{ mt: "auto" }}>
            <Divider />
            <List>
              <ListItemButton selected={vs.view === "trash"} onClick={() => vs.goTo("trash")}>
                <RestoreFromTrashIcon fontSize="small" style={{ marginRight: 12 }} />
                <ListItemText primary="回收桶" secondary="30 天後自動清除" />
              </ListItemButton>
            </List>
          </Box>
        </Box>
      </Drawer>

      <Box sx={{ py: 3 }}>
        <Container maxWidth="sm">
          {vs.view === "items" && (
            <>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    總計（{vs.viewMode === "monthly" ? "月" : "年"}）
                  </Typography>
                  <Typography variant="h5">{formatMoney(total, "TWD")}</Typography>
                </CardContent>
              </Card>

              {loading && (
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  載入中…
                </Typography>
              )}

              <Stack spacing={2}>
                {activeItems
                  .slice()
                  .sort((a, b) => compareItems(a, b, vs.sortKey, vs.sortOrder))
                  .map((item) => {
                    const normalized =
                      vs.viewMode === "monthly"
                        ? Math.round(toMonthlyAmount(item))
                        : Math.round(toYearlyAmount(item));

                    return (
                      <ItemCard
                        key={item.id}
                        item={item}
                        amountLabel={formatMoney(normalized, "TWD")}
                        onClick={() => {
                          setEditing(item);
                          setDialogOpen(true);
                        }}
                      />
                    );
                  })}
              </Stack>

              <Fab
                color="primary"
                sx={{ position: "fixed", right: 20, bottom: 20 }}
                onClick={() => {
                  setEditing(undefined);
                  setDialogOpen(true);
                }}
              >
                <AddIcon />
              </Fab>
            </>
          )}

          {vs.view === "trash" && (
            <Stack spacing={2}>
              {trashItems
                .slice()
                .sort((a, b) => compareItems(a, b, vs.sortKey, vs.sortOrder))
                .map((item) => {
                  const normalized =
                    vs.viewMode === "monthly"
                      ? Math.round(toMonthlyAmount(item))
                      : Math.round(toYearlyAmount(item));
                  const amountLabel = formatMoney(normalized, "TWD");

                  return (
                    <Card key={item.id} variant="outlined">
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                          <Typography variant="h6">{item.name}</Typography>
                          <Typography variant="h6">{amountLabel}</Typography>
                        </Stack>

                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          刪除日：{item.deletedAtISO || "—"} ｜ 將於 {item.purgeAfterISO || "—"} 永久刪除
                        </Typography>

                        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                          <Button variant="outlined" onClick={() => restore(item.id)}>
                            還原
                          </Button>
                          <Button
                            color="error"
                            variant="outlined"
                            onClick={() => {
                              if (confirm("確定永久刪除？此動作無法復原")) {
                                removeForever(item.id);
                              }
                            }}
                          >
                            永久刪除
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
            </Stack>
          )}

          {vs.view === "settings" && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void handleImportFile(file);
                  e.currentTarget.value = "";
                }}
              />

              <SettingsView
                themeMode={settings.themeMode}
                onToggleTheme={() =>
                  actions.setThemeMode(settings.themeMode === "light" ? "dark" : "light")
                }
                defaultViewMode={settings.defaultViewMode}
                onChangeDefaultViewMode={actions.setDefaultViewMode}
                defaultSortKey={settings.defaultSortKey}
                onChangeDefaultSortKey={actions.setDefaultSortKey}
                defaultSortOrder={settings.defaultSortOrder}
                onChangeDefaultSortOrder={actions.setDefaultSortOrder}
                onExport={handleExport}
                onImportClick={() => fileInputRef.current?.click()}
                origin={window.location.origin}
                dbName={DB_NAME}
                storeName={STORE_NAME}
                itemsCount={{
                  active: activeItems.length,
                  trash: trashItems.length,
                  total: items.length,
                }}
              />
            </>
          )}
        </Container>
      </Box>

      <ItemDialog
        open={dialogOpen}
        initialItem={editing}
        onClose={() => setDialogOpen(false)}
        onSubmit={(item) => {
          if (editing?.deletedAtISO) {
            item.deletedAtISO = editing.deletedAtISO;
            item.purgeAfterISO = editing.purgeAfterISO;
          }
          editing ? update(item) : add(item);
        }}
        onMoveToTrash={(id) => softDelete(id)}
      />
    </>
  );
}
