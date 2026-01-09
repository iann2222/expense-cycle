import { useEffect, useMemo, useRef, useState } from "react";
import type { SubscriptionItem } from "./types/models";
import { useSettings } from "./state/useSettings";
import { computeNextDates } from "./utils/recurrence";

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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import SettingsIcon from "@mui/icons-material/Settings";
import LabelIcon from "@mui/icons-material/Label";

import {
  useItems,
  DB_NAME,
  STORE_NAME,
  type BackupPayload,
} from "./state/useItems";
import type { SettingsV1, SortKey, SortOrder, DefaultViewMode } from "./state/useSettings";
import { useViewState } from "./state/useViewState";

import { ItemCard } from "./components/ItemCard";
import { ItemDialog } from "./components/ItemDialog";
import { SettingsView } from "./components/SettingsView";
import { TagsView, type TagColors } from "./components/TagsView";

const TAG_COLORS_KEY = "expenseCycle.tagColors";
const TZ = "Asia/Taipei";
const TZ_WARNING_KEY = "expenseCycle.dismissTzWarning.v1";

function todayISO_UTC8() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function timeHM_UTC8() {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

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

function formatNTD(n: number) {
  const v = Number.isFinite(n) ? Math.round(n) : 0;
  return `${v.toLocaleString("zh-TW")} NTD`;
}

function formatOriginalLabel(item: SubscriptionItem) {
  const unit = item.cycle === "monthly" ? "月" : "年";
  return `${formatNTD(item.amount)} / ${unit}`;
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
  const notesHit = normalizeText(item.notes || "").includes(q);

  return nameHit || tagHit || notesHit;
}

function matchesTagsOR(item: SubscriptionItem, selectedTags: string[]) {
  if (selectedTags.length === 0) return true;
  const tags = item.tags || [];
  return selectedTags.some((t) => tags.includes(t));
}

function diffDays(fromISO: string, toISO: string) {
  const [fy, fm, fd] = fromISO.split("-").map(Number);
  const [ty, tm, td] = toISO.split("-").map(Number);

  // 用 UTC 中午，避免時區/DST 造成落在前/後一天
  const a = Date.UTC(fy, fm - 1, fd, 12, 0, 0);
  const b = Date.UTC(ty, tm - 1, td, 12, 0, 0);

  return Math.round((b - a) / 86400000);
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

  const vs = useViewState(settings);
  const [extraView, setExtraView] = useState<"tags" | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionItem | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [tagColors, setTagColors] = useState<TagColors>(() => loadTagColors());

  const [tzWarningOpen, setTzWarningOpen] = useState(false);
  const [tzInfo, setTzInfo] = useState({ timeZone: "", offsetMin: 0 });

  function setTagColor(tag: string, color: string) {
    setTagColors((prev) => {
      const next = { ...prev };
      if (!color) delete next[tag];
      else next[tag] = color;
      saveTagColors(next);
      return next;
    });
  }

  // ✅ 今日日期（會自動刷新）
  const [nowISO, setNowISO] = useState(() => todayISO_UTC8());
  const [lastTickTime, setLastTickTime] = useState(() => timeHM_UTC8());

  useEffect(() => {
    function tick() {
      setNowISO(todayISO_UTC8());
      setLastTickTime(timeHM_UTC8());
    }

    tick();

    window.addEventListener("focus", tick);

    function onVis() {
      if (document.visibilityState === "visible") tick();
    }
    document.addEventListener("visibilitychange", onVis);

    const id = window.setInterval(tick, 60_000);

    return () => {
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const dismissedDate = localStorage.getItem(TZ_WARNING_KEY);
    const today = todayISO_UTC8();
    if (dismissedDate === today) return;

    const offsetMin = new Date().getTimezoneOffset(); // UTC+8 => -480
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";

    setTzInfo({ timeZone, offsetMin });

    const isUTC8 = offsetMin === -480;
    if (!isUTC8) setTzWarningOpen(true);
  }, []);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const it of activeItems) for (const t of it.tags || []) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "zh-Hant"));
  }, [activeItems]);

  const nextDateMap = useMemo(() => {
    const map = new Map<string, NextDates>();
    for (const it of activeItems) {
      const { nextPayable, nextDue } = computeNextDates(it, nowISO);
      map.set(it.id, { nextPayable, nextDue });
    }
    return map;
  }, [activeItems, nowISO]);

  const visibleActiveItems = useMemo(() => {
    return activeItems
      .filter((it) => matchesSearch(it, vs.searchText))
      .filter((it) => matchesTagsOR(it, vs.selectedTags))
      .slice()
      .sort((a, b) =>
        compareItemsWithNext(a, b, vs.sortKey, vs.sortOrder, nextDateMap)
      );
  }, [
    activeItems,
    vs.searchText,
    vs.selectedTags,
    vs.sortKey,
    vs.sortOrder,
    nextDateMap,
  ]);

  const visibleTrashItems = useMemo(() => {
    return trashItems
      .slice()
      .sort((a, b) => (b.deletedAtISO || "").localeCompare(a.deletedAtISO || ""));
  }, [trashItems]);

  const totalMonthlyRaw = useMemo(() => {
		return Math.round(
			visibleActiveItems.reduce((acc, it) => acc + (it.cycle === "monthly" ? it.amount : 0), 0)
		);
	}, [visibleActiveItems]);

	const totalYearlyRaw = useMemo(() => {
		return Math.round(
			visibleActiveItems.reduce((acc, it) => acc + (it.cycle === "yearly" ? it.amount : 0), 0)
		);
	}, [visibleActiveItems]);

	const totalMonthlyEq = useMemo(() => {
		return Math.round(visibleActiveItems.reduce((acc, it) => acc + toMonthlyAmount(it), 0));
	}, [visibleActiveItems]);

	const totalYearlyEq = useMemo(() => {
		return Math.round(visibleActiveItems.reduce((acc, it) => acc + toYearlyAmount(it), 0));
	}, [visibleActiveItems]);


  const total = useMemo(() => {
    if (vs.viewMode === "monthly") return totalMonthlyEq;
    if (vs.viewMode === "yearly") return totalYearlyEq;
    // original 不使用這個 total（會用 totalMonthlyEq/totalYearlyEq 顯示）
    return totalMonthlyEq;
  }, [vs.viewMode, totalMonthlyEq, totalYearlyEq]);

  function handleExport() {
    const payload = exportBackup();

    const wrapped = {
      ...payload,
      tagColors,
    };

    const blob = new Blob([JSON.stringify(wrapped, null, 2)], {
      type: "application/json",
    });
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

    if (raw?.tagColors && typeof raw.tagColors === "object") {
      const next = raw.tagColors as TagColors;
      setTagColors(next);
      saveTagColors(next);
    }

    try {
      await importBackupReplace(raw as BackupPayload);
      alert("匯入完成（已覆蓋本機資料）");
      setExtraView(null);
      vs.backToItems();
    } catch (e) {
      alert(`匯入失敗：${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function renameTag(oldTag: string, newTag: string) {
    const nextTag = newTag.trim();
    if (!nextTag) return;

    const affected = items.filter((it) => (it.tags || []).includes(oldTag));
    for (const it of affected) {
      const nextTags = (it.tags || []).map((t) => (t === oldTag ? nextTag : t));
      const dedup = Array.from(new Set(nextTags));
      await update({ ...it, tags: dedup });
    }

    setTagColors((prev) => {
      const next = { ...prev };
      if (next[oldTag] && !next[nextTag]) next[nextTag] = next[oldTag];
      delete next[oldTag];
      saveTagColors(next);
      return next;
    });
  }

  async function removeTag(tag: string) {
    const affected = items.filter((it) => (it.tags || []).includes(tag));
    for (const it of affected) {
      const nextTags = (it.tags || []).filter((t) => t !== tag);
      await update({ ...it, tags: nextTags });
    }

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

  function viewModeLabel(vm: DefaultViewMode) {
    if (vm === "original") return "依原週期";
    if (vm === "monthly") return "月";
    return "年";
  }

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

          <Typography
            variant="h6"
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            ExpenseCycle{titleSuffix}
          </Typography>
        </Toolbar>
      </AppBar>

      <Toolbar />

      <Drawer open={vs.drawerOpen} onClose={vs.closeDrawer}>
        <Box sx={{ width: 280, display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              選單
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              時間：{nowISO} {lastTickTime} (UTC+8)
            </Typography>

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

            <Button
              size="small"
              sx={{ mt: 1, px: 0, justifyContent: "flex-start" }}
              onClick={vs.resetSortToDefault}
            >
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
                label="依原週期"
                clickable
                color={vs.viewMode === "original" ? "primary" : "default"}
                variant={vs.viewMode === "original" ? "filled" : "outlined"}
                onClick={() => vs.changeViewMode("original")}
              />
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
                    總計（{viewModeLabel(vs.viewMode)}）
                  </Typography>

                  {vs.viewMode === "original" ? (
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      <Typography variant="h6">
												{formatNTD(totalMonthlyRaw)}（月）＋ {formatNTD(totalYearlyRaw)}（年）
											</Typography>
                    </Stack>
                  ) : (
                    <Typography variant="h5">{formatNTD(total)}</Typography>
                  )}
                </CardContent>
              </Card>

              {loading && (
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  載入中…
                </Typography>
              )}

              <Stack spacing={2}>
                {visibleActiveItems.map((item) => {
                  const next = nextDateMap.get(item.id);
                  const payableISO = next?.nextPayable ?? item.payableFromISO;
                  const dueISO = next?.nextDue ?? item.dueDateISO;

                  const daysLeft = diffDays(nowISO, dueISO);

                  const showStatus =
                    settings.statusWindowDays >= 0 &&
                    daysLeft >= 0 &&
                    daysLeft <= settings.statusWindowDays;

                  const statusText = showStatus
                    ? daysLeft === 0
                      ? "今天到期"
                      : `剩 ${daysLeft} 天`
                    : undefined;

                  const alert =
                    (item.needsAttention ?? true) &&
                    settings.alertDays >= 0 &&
                    daysLeft >= 0 &&
                    daysLeft <= settings.alertDays;

                  // ✅ 三種口徑的金額顯示
                  let amountLabel: string;
                  if (vs.viewMode === "original") {
                    amountLabel = formatOriginalLabel(item);
                  } else if (vs.viewMode === "monthly") {
                    amountLabel = formatNTD(Math.round(toMonthlyAmount(item)));
                  } else {
                    amountLabel = formatNTD(Math.round(toYearlyAmount(item)));
                  }

                  return (
                    <ItemCard
                      key={item.id}
                      item={item}
                      amountLabel={amountLabel}
                      tagColors={tagColors}
                      payableISO={payableISO}
                      dueISO={dueISO}
                      statusText={statusText}
                      alert={alert}
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
                // 回收桶仍可跟隨 viewMode 顯示金額
                let amountLabel: string;
                if (vs.viewMode === "original") {
                  amountLabel = formatOriginalLabel(item);
                } else if (vs.viewMode === "monthly") {
                  amountLabel = formatNTD(Math.round(toMonthlyAmount(item)));
                } else {
                  amountLabel = formatNTD(Math.round(toYearlyAmount(item)));
                }

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
                onToggleTheme={() =>
                  actions.setThemeMode(settings.themeMode === "light" ? "dark" : "light")
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
        nowISO={nowISO}
        onSubmit={(item) => {
          if (editing?.deletedAtISO) {
            item.deletedAtISO = editing.deletedAtISO;
            item.purgeAfterISO = editing.purgeAfterISO;
          }
          editing ? update(item) : add(item);
        }}
        onMoveToTrash={(id) => {
          void softDelete(id);
        }}
      />

      <Dialog open={tzWarningOpen} onClose={() => setTzWarningOpen(false)}>
        <DialogTitle>時區提醒</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
            {`偵測到你的裝置時區可能不是 UTC+8（Asia/Taipei）。
						ExpenseCycle 目前只支援以 UTC+8 計算日期與星期，裝置時區不同很可能導致日期時間有誤。`}
          </Typography>

          <Typography variant="body2" sx={{ mt: 1 }}>
            目前偵測：
            <br />
            timeZone：{tzInfo.timeZone || "（未知）"}
            <br />
            offset：UTC{tzInfo.offsetMin <= 0 ? "+" : "-"}
            {String(Math.abs(tzInfo.offsetMin / 60)).padStart(2, "0")}:00
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            建議將裝置時區設定為 UTC+8（例如：台北/香港/新加坡）。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              localStorage.setItem(TZ_WARNING_KEY, todayISO_UTC8());
              setTzWarningOpen(false);
            }}
          >
            今天不再提示
          </Button>
          <Button variant="contained" onClick={() => setTzWarningOpen(false)}>
            我知道了
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
