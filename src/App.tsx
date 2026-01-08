import { useMemo, useRef, useState } from "react";
import type { SubscriptionItem } from "./types/models";
import { useSettings } from "./state/useSettings";
import { computeNextDates, todayISO } from "./utils/recurrence";

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
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import SettingsIcon from "@mui/icons-material/Settings";
import LabelIcon from "@mui/icons-material/Label";

import { useItems, DB_NAME, STORE_NAME, type BackupPayload } from "./state/useItems";
import type { SettingsV1, SortKey, SortOrder } from "./state/useSettings";
import { useViewState } from "./state/useViewState";

import { ItemCard } from "./components/ItemCard";
import { ItemDialog } from "./components/ItemDialog";
import { SettingsView } from "./components/SettingsView";
import { TagsView, type TagColors } from "./components/TagsView";

const TAG_COLORS_KEY = "expenseCycle.tagColors";

function loadTagColors(): TagColors {
  try {
    const raw = localStorage.getItem(TAG_COLORS_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw) as TagColors;
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function saveTagColors(map: TagColors) {
  localStorage.setItem(TAG_COLORS_KEY, JSON.stringify(map));
}

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

function normalizeText(s: string) {
  return s.trim().toLowerCase();
}

function matchesSearch(item: SubscriptionItem, query: string) {
  if (!query) return true;
  const q = normalizeText(query);

  const nameHit = normalizeText(item.name).includes(q);
  const tagHit = (item.tags || []).some((t) => normalizeText(t).includes(q));
  const notesHit = normalizeText(item.notes || "").includes(q); // ✅ 搜尋也納入備註

  return nameHit || tagHit || notesHit;
}

function matchesTagsOR(item: SubscriptionItem, selectedTags: string[]) {
  if (selectedTags.length === 0) return true;
  const tags = item.tags || [];
  return selectedTags.some((t) => tags.includes(t));
}

type NextDates = { nextPayable: string; nextDue: string };

function compareItemsWithNext(
  a: SubscriptionItem,
  b: SubscriptionItem,
  key: SortKey,
  order: SortOrder,
  nextMap: Map<string, NextDates>
) {
  let result = 0;

  if (key === "dueDate") {
    const ad = nextMap.get(a.id)?.nextDue ?? a.dueDateISO;
    const bd = nextMap.get(b.id)?.nextDue ?? b.dueDateISO;
    result = ad.localeCompare(bd);
  } else if (key === "amount") {
    result = a.amount - b.amount;
  } else {
    result = a.name.localeCompare(b.name, "zh-Hant");
  }

  return order === "asc" ? result : -result;
}

export default function App({
  settings,
  actions,
}: {
  settings: SettingsV1;
  actions: ReturnType<typeof useSettings>["actions"];
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

  // view：items/trash/settings + tags（extraView）
  const vs = useViewState(settings);
  const [extraView, setExtraView] = useState<"tags" | null>(null); // null 表示由 vs.view 控制

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionItem | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [tagColors, setTagColors] = useState<TagColors>(() => loadTagColors());

  function setTagColor(tag: string, color: string) {
    setTagColors((prev) => {
      const next = { ...prev };
      if (!color) delete next[tag];
      else next[tag] = color;
      saveTagColors(next);
      return next;
    });
  }

  // Drawer：標籤清單（只從 activeItems 蒐集）
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const it of activeItems) for (const t of it.tags || []) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "zh-Hant"));
  }, [activeItems]);

  // ✅ 今日（用 recurrence 的 todayISO）
  const nowISO = useMemo(() => todayISO(), []);

  // ✅ 建立 nextDateMap：用週期推算出下一次日期（只針對 activeItems）
  const nextDateMap = useMemo(() => {
    const map = new Map<string, NextDates>();
    for (const it of activeItems) {
      const { nextPayable, nextDue } = computeNextDates(it, nowISO);
      map.set(it.id, { nextPayable, nextDue });
    }
    return map;
  }, [activeItems, nowISO]);

  // items 視圖：先 filter（搜尋 + tag OR），再排序（排序用 nextDue）
  const visibleActiveItems = useMemo(() => {
    return activeItems
      .filter((it) => matchesSearch(it, vs.searchText))
      .filter((it) => matchesTagsOR(it, vs.selectedTags))
      .slice()
      .sort((a, b) => compareItemsWithNext(a, b, vs.sortKey, vs.sortOrder, nextDateMap));
  }, [activeItems, vs.searchText, vs.selectedTags, vs.sortKey, vs.sortOrder, nextDateMap]);

  // 回收桶：永遠按刪除時間排序（最新刪除在前）
  const visibleTrashItems = useMemo(() => {
    return trashItems.slice().sort((a, b) => (b.deletedAtISO || "").localeCompare(a.deletedAtISO || ""));
  }, [trashItems]);

  const total = useMemo(() => {
    return Math.round(
      visibleActiveItems.reduce(
        (acc, it) => acc + (vs.viewMode === "monthly" ? toMonthlyAmount(it) : toYearlyAmount(it)),
        0
      )
    );
  }, [visibleActiveItems, vs.viewMode]);

  function handleExport() {
    const payload = exportBackup();

    // ✅ 把 tagColors 也一起打包（不改 useItems 的 payload 型別）
    const wrapped = {
      ...payload,
      tagColors,
    };

    const blob = new Blob([JSON.stringify(wrapped, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-cycle-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    let raw: any;

    try {
      raw = JSON.parse(text);
    } catch {
      alert("匯入失敗：不是有效的 JSON");
      return;
    }

    // ✅ 兼容：如果檔案有帶 tagColors，就先還原
    if (raw?.tagColors && typeof raw.tagColors === "object") {
      const next = raw.tagColors as TagColors;
      setTagColors(next);
      saveTagColors(next);
    }

    // ✅ 再把 items payload 部分交給 useItems 匯入（覆蓋模式）
    try {
      await importBackupReplace(raw as BackupPayload);
      alert("匯入完成（已覆蓋本機資料）");
      setExtraView(null);
      vs.backToItems();
    } catch (e) {
      alert(`匯入失敗：${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ✅ 全域標籤改名：替換所有 items（含回收桶），並搬移顏色
  async function renameTag(oldTag: string, newTag: string) {
    const nextTag = newTag.trim();
    if (!nextTag) return;

    const affected = items.filter((it) => (it.tags || []).includes(oldTag));
    for (const it of affected) {
      const nextTags = (it.tags || []).map((t) => (t === oldTag ? nextTag : t));
      const dedup = Array.from(new Set(nextTags));
      await update({ ...it, tags: dedup });
    }

    // 顏色搬家（如果新標籤還沒顏色）
    setTagColors((prev) => {
      const next = { ...prev };
      if (next[oldTag] && !next[nextTag]) next[nextTag] = next[oldTag];
      delete next[oldTag];
      saveTagColors(next);
      return next;
    });
  }

  // ✅ 全域移除標籤：從所有 items 移除該 tag
  async function removeTag(tag: string) {
    const affected = items.filter((it) => (it.tags || []).includes(tag));
    for (const it of affected) {
      const nextTags = (it.tags || []).filter((t) => t !== tag);
      await update({ ...it, tags: nextTags });
    }

    // 也清掉顏色 metadata
    setTagColors((prev) => {
      const next = { ...prev };
      delete next[tag];
      saveTagColors(next);
      return next;
    });
  }

  const inTagsView = extraView === "tags";
  const titleSuffix = inTagsView
    ? "（標籤）"
    : vs.view === "trash"
    ? "（回收桶）"
    : vs.view === "settings"
    ? "（設定）"
    : "";

  return (
    <>
      <AppBar position="fixed" elevation={0}>
        <Toolbar>
          <IconButton
            edge="start"
            sx={{ mr: 1 }}
            onClick={() => {
              if (inTagsView) {
                setExtraView(null);
                return;
              }
              if (vs.view !== "items") {
                vs.backToItems();
                return;
              }
              vs.openDrawer();
            }}
          >
            {inTagsView || vs.view !== "items" ? <ArrowBackIcon /> : <MenuIcon />}
          </IconButton>

          <Typography variant="h6" sx={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
            ExpenseCycle{titleSuffix}
          </Typography>
        </Toolbar>
      </AppBar>

      <Toolbar />

      <Drawer open={vs.drawerOpen} onClose={vs.closeDrawer}>
        <Box sx={{ width: 280, display: "flex", flexDirection: "column", height: "100%" }}>
          {/* 功能（搜尋/篩選） */}
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1">功能</Typography>

            <TextField
              size="small"
              fullWidth
              label="搜尋（名稱 / 標籤 / 備註）"
              value={vs.searchText}
              onChange={(e) => vs.setSearchText(e.target.value)}
              sx={{ mt: 1.5 }}
            />

            <Box sx={{ mt: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography variant="body2" color="text.secondary">
                  依標籤篩選（多選）
                </Typography>
                <Button size="small" onClick={vs.clearFilters}>
                  清除
                </Button>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                {availableTags.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    尚無標籤
                  </Typography>
                )}
                {availableTags.map((tag) => {
                  const selected = vs.selectedTags.includes(tag);
                  const color = tagColors[tag];
                  return (
                    <Chip
                      key={tag}
                      label={tag}
                      clickable
                      color={selected ? "primary" : "default"}
                      variant={selected ? "filled" : color ? "filled" : "outlined"}
                      onClick={() => vs.toggleTag(tag)}
                      sx={{
                        mb: 1,
                        bgcolor: selected ? undefined : color || undefined,
                        color: selected ? undefined : color ? "#fff" : undefined,
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>
          </Box>

          <Divider />

          {/* 全部項目 + 標籤管理 */}
          <List>
            <ListItemButton
              selected={!inTagsView && vs.view === "items"}
              onClick={() => {
                setExtraView(null);
                vs.goTo("items");
              }}
            >
              <ListItemText primary="全部項目" />
            </ListItemButton>

            <ListItemButton
              selected={inTagsView}
              onClick={() => {
                setExtraView("tags");
                vs.closeDrawer();
              }}
            >
              <LabelIcon fontSize="small" style={{ marginRight: 12 }} />
              <ListItemText primary="標籤管理" />
            </ListItemButton>
          </List>

          <Divider />

          {/* 排序 */}
          <Box sx={{ px: 2, pb: 2, pt: 1.5 }}>
            <Typography variant="overline" color="text.secondary">
              排序
            </Typography>

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

            <Button size="small" sx={{ mt: 1, px: 0, justifyContent: "flex-start" }} onClick={vs.resetSortToDefault}>
              回復預設
            </Button>
          </Box>

          <Divider />

          {/* 統計口徑 */}
          <Box sx={{ px: 2, pb: 2, pt: 1.5 }}>
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

            <Button size="small" sx={{ mt: 1, px: 0, justifyContent: "flex-start" }} onClick={vs.resetViewModeToDefault}>
              回復預設
            </Button>
          </Box>

          {/* 底部：設定（回收桶上方）＋ 回收桶 */}
          <Box sx={{ mt: "auto" }}>
            <Divider />
            <List>
              <ListItemButton
                selected={!inTagsView && vs.view === "settings"}
                onClick={() => {
                  setExtraView(null);
                  vs.goTo("settings");
                }}
              >
                <SettingsIcon fontSize="small" style={{ marginRight: 12 }} />
                <ListItemText primary="設定" />
              </ListItemButton>

              <ListItemButton
                selected={!inTagsView && vs.view === "trash"}
                onClick={() => {
                  setExtraView(null);
                  vs.goTo("trash");
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
          {inTagsView && (
            <TagsView
              items={items}
              tagColors={tagColors}
              onSetTagColor={setTagColor}
              onRenameTag={renameTag}
              onRemoveTag={removeTag}
            />
          )}

          {!inTagsView && vs.view === "items" && (
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
                {visibleActiveItems.map((item) => {
                  const normalized =
                    vs.viewMode === "monthly" ? Math.round(toMonthlyAmount(item)) : Math.round(toYearlyAmount(item));

                  const next = nextDateMap.get(item.id);

                  return (
                    <ItemCard
                      key={item.id}
                      item={item}
                      amountLabel={formatMoney(normalized, "TWD")}
                      tagColors={tagColors}
                      nextPayableISO={next?.nextPayable ?? item.payableFromISO}
                      nextDueISO={next?.nextDue ?? item.dueDateISO}
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

          {!inTagsView && vs.view === "trash" && (
            <Stack spacing={2}>
              {visibleTrashItems.map((item) => {
                const normalized =
                  vs.viewMode === "monthly" ? Math.round(toMonthlyAmount(item)) : Math.round(toYearlyAmount(item));
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

          {!inTagsView && vs.view === "settings" && (
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
                onToggleTheme={() => actions.setThemeMode(settings.themeMode === "light" ? "dark" : "light")}
                showWeekdayInDayPicker={settings.showWeekdayInDayPicker}
                onChangeShowWeekdayInDayPicker={actions.setShowWeekdayInDayPicker}
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
        showWeekdayInDayPicker={settings.showWeekdayInDayPicker}
        onSubmit={(item) => {
          // 保留既有刪除狀態（安全處理）
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
