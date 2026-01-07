import { useMemo, useState } from "react";
import type { SubscriptionItem } from "./types/models";
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  CssBaseline,
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
import AddIcon from "@mui/icons-material/Add";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { useItems } from "./state/useItems";
import { ItemCard } from "./components/ItemCard";
import { ItemDialog } from "./components/ItemDialog";

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

type View = "items" | "trash";

export default function App() {
  const { loading, activeItems, trashItems, add, update, softDelete, restore, removeForever } =
    useItems();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useState<View>("items");

  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionItem | undefined>(undefined);

  const total = useMemo(() => {
    return Math.round(
      activeItems.reduce(
        (acc, it) => acc + (viewMode === "monthly" ? toMonthlyAmount(it) : toYearlyAmount(it)),
        0
      )
    );
  }, [activeItems, viewMode]);

  const visibleItems = view === "items" ? activeItems : trashItems;

  return (
    <>
      <AppBar position="fixed" elevation={0}>
        <Toolbar>
          <IconButton
						edge="start"
						sx={{ mr: 1 }}
						onClick={() => {
							if (view === "trash") {
								setView("items");
							} else {
								setDrawerOpen(true);
							}
						}}
					>
						{view === "trash" ? <ArrowBackIcon /> : <MenuIcon />}
					</IconButton>

          <Typography
						variant="h6"
						sx={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}
					>
						ExpenseCycle{view === "trash" ? "（回收桶）" : ""}
					</Typography>

          {/* AppBar 右側保持乾淨；主要控制集中在 Drawer */}
        </Toolbar>
      </AppBar>

			<Toolbar />

      {/* Drawer：功能欄 */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 280, display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1">功能</Typography>
            <Typography variant="body2" color="text.secondary">
              搜尋 / 篩選 / 排序 會放在這裡（下一步）
            </Typography>
          </Box>

          <Divider />

          {/* 視圖切換 */}
          <List>
            <ListItemButton
              selected={view === "items"}
              onClick={() => {
                setView("items");
                setDrawerOpen(false);
              }}
            >
              <ListItemText primary="全部項目" />
            </ListItemButton>
          </List>

          {/* 統計口徑：放 Drawer，不放 AppBar */}
          <Box sx={{ px: 2, pb: 2 }}>
            <Typography variant="overline" color="text.secondary">
              統計口徑
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip
                label="月"
                clickable
                color={viewMode === "monthly" ? "primary" : "default"}
                variant={viewMode === "monthly" ? "filled" : "outlined"}
                onClick={() => setViewMode("monthly")}
              />
              <Chip
                label="年"
                clickable
                color={viewMode === "yearly" ? "primary" : "default"}
                variant={viewMode === "yearly" ? "filled" : "outlined"}
                onClick={() => setViewMode("yearly")}
              />
            </Stack>
          </Box>

          <Divider />

          {/* 這裡預留：搜尋 / 標籤篩選 / 排序（下一步做） */}
          <Box sx={{ px: 2, py: 2 }}>
            <Typography variant="overline" color="text.secondary">
              （預留）
            </Typography>
            <Typography variant="body2" color="text.secondary">
              - 搜尋（名稱/標籤）{"\n"}- 依標籤篩選{"\n"}- 排序方式
            </Typography>
          </Box>

          {/* 最底部：回收桶 */}
          <Box sx={{ mt: "auto" }}>
            <Divider />
            <List>
              <ListItemButton
                selected={view === "trash"}
                onClick={() => {
                  setView("trash");
                  setDrawerOpen(false);
                }}
              >
                <RestoreFromTrashIcon fontSize="small" style={{ marginRight: 12 }} />
                <ListItemText primary="回收桶" secondary="30 天後自動清除" />
              </ListItemButton>
            </List>
          </Box>
        </Box>
      </Drawer>

      <Box sx={{ py: 3 }}>
        <Container maxWidth="sm">
          {view === "items" && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  總計（{viewMode === "monthly" ? "月" : "年"}）
                </Typography>
                <Typography variant="h5">{formatMoney(total, "TWD")}</Typography>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              載入中…
            </Typography>
          )}

          <Stack spacing={2}>
            {visibleItems
              .slice()
              .sort((a, b) => a.dueDateISO.localeCompare(b.dueDateISO))
              .map((item) => {
                const normalized =
                  viewMode === "monthly"
                    ? Math.round(toMonthlyAmount(item))
                    : Math.round(toYearlyAmount(item));

                const amountLabel = formatMoney(normalized, "TWD");

                if (view === "items") {
                  return (
                    <ItemCard
                      key={item.id}
                      item={item}
                      amountLabel={amountLabel}
                      onClick={() => {
                        setEditing(item);
                        setDialogOpen(true);
                      }}
                    />
                  );
                }

                // 回收桶：卡片不可編輯，提供還原/永久刪除
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
                        <Button
                          variant="outlined"
                          onClick={() => restore(item.id)}
                        >
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

          {/* 主視圖才顯示新增 FAB */}
          {view === "items" && (
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
          )}
        </Container>
      </Box>

      <ItemDialog
        open={dialogOpen}
        initialItem={editing}
        onClose={() => setDialogOpen(false)}
        onSubmit={(item) => {
          // 保留既有刪除狀態（理論上編輯不會在回收桶中發生，但安全處理）
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
