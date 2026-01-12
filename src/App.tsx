import { useEffect, useMemo, useState } from "react";
import type { SubscriptionItem } from "./types/models";
import type { SettingsV1 } from "./state/useSettings";
import { useItems, DB_NAME, STORE_NAME } from "./state/useItems";
import { useViewState } from "./state/useViewState";
import { computeNextDates } from "./utils/recurrence";

import {
  AppBar,
  Box,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Toolbar,
  Typography,
  Button,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { AppDrawer } from "./components/AppDrawer";
import { ItemDialog } from "./components/ItemDialog";
import { TagsPage } from "./views/TagsPage";
import { ItemsView } from "./views/ItemsView";
import { TrashView } from "./views/TrashView";

import type { TagColors } from "./components/TagsView";
import { todayISO_UTC8, timeHM_UTC8 } from "./utils/dates";
import { matchesSearch, matchesTagsOR } from "./utils/search";
import { compareItemsWithNext, type NextDates } from "./utils/sort";
import { SettingsPage } from "./views/SettingsPage";

const TAG_COLORS_KEY = "expenseCycle.tagColors";
const TZ_WARNING_KEY = "expenseCycle.dismissTzWarning.v1";

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

export default function App({
  settings,
  actions,
}: {
  settings: SettingsV1;
  actions: {
    setThemeMode: (m: "light" | "dark") => void;
    setShowWeekdayInDayPicker: (v: boolean) => void;
    setStatusWindowDays: (n: number) => void;
    setAlertDays: (n: number) => void;
    setDefaultViewMode: (m: SettingsV1["defaultViewMode"]) => void;
    setDefaultSortKey: (k: SettingsV1["defaultSortKey"]) => void;
    setDefaultSortOrder: (o: SettingsV1["defaultSortOrder"]) => void;
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

  // tags page state
  const [extraView, setExtraView] = useState<"tags" | null>(null);

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionItem | undefined>(
    undefined
  );

  // tag colors
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

  // time (UTC+8)
  const [nowISO, setNowISO] = useState(() => todayISO_UTC8());
  const [timeHM, setTimeHM] = useState(() => timeHM_UTC8());

  useEffect(() => {
    function tick() {
      setNowISO(todayISO_UTC8());
      setTimeHM(timeHM_UTC8());
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

  // timezone warning dialog
  const [tzWarningOpen, setTzWarningOpen] = useState(false);
  const [tzInfo, setTzInfo] = useState({ timeZone: "", offsetMin: 0 });

  useEffect(() => {
    const dismissedDate = localStorage.getItem(TZ_WARNING_KEY);
    const today = todayISO_UTC8();
    if (dismissedDate === today) return;

    const offsetMin = new Date().getTimezoneOffset(); // UTC+8 => -480
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    setTzInfo({ timeZone, offsetMin });

    if (offsetMin !== -480) setTzWarningOpen(true);
  }, []);

  // tags
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const it of activeItems) for (const t of it.tags || []) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "zh-Hant"));
  }, [activeItems]);

  // next dates map
  const nextDateMap = useMemo(() => {
    const map = new Map<string, NextDates>();
    for (const it of activeItems) {
      const { nextPayable, nextDue } = computeNextDates(it, nowISO);
      map.set(it.id, { nextPayable, nextDue });
    }
    return map;
  }, [activeItems, nowISO]);

  // visible items (search/filter/sort)
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
      .sort((a, b) =>
        (b.deletedAtISO || "").localeCompare(a.deletedAtISO || "")
      );
  }, [trashItems]);

  // totals for "original"
  const totalMonthlyRaw = useMemo(() => {
    return Math.round(
      visibleActiveItems.reduce(
        (acc, it) => acc + (it.cycle === "monthly" ? it.amount : 0),
        0
      )
    );
  }, [visibleActiveItems]);

  const totalYearlyRaw = useMemo(() => {
    return Math.round(
      visibleActiveItems.reduce(
        (acc, it) => acc + (it.cycle === "yearly" ? it.amount : 0),
        0
      )
    );
  }, [visibleActiveItems]);

  function handleExport() {
    const payload = exportBackup();
    const wrapped = { ...payload, tagColors };

    const blob = new Blob([JSON.stringify(wrapped, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-cycle-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
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

    // 匯入 tagColors（若檔案內有）
    if (raw?.tagColors && typeof raw.tagColors === "object") {
      const next = raw.tagColors as TagColors;
      setTagColors(next);
      saveTagColors(next);
    }

    try {
      await importBackupReplace(raw);
      alert("匯入完成（已覆蓋本機資料）");
      setExtraView(null);
      vs.backToItems();
    } catch (e) {
      alert(`匯入失敗：${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // tag edit operations
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

  function handleTopLeftClick() {
    if (inTagsView) {
      setExtraView(null);
      return;
    }
    if (vs.view !== "items") {
      vs.backToItems();
      return;
    }
    vs.openDrawer();
  }

  return (
    <>
      <AppBar position="fixed" elevation={0}>
        <Toolbar>
          <IconButton edge="start" sx={{ mr: 1 }} onClick={handleTopLeftClick}>
            {inTagsView || vs.view !== "items" ? (
              <ArrowBackIcon />
            ) : (
              <MenuIcon />
            )}
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

      <AppDrawer
        open={vs.drawerOpen}
        onClose={vs.closeDrawer}
        nowISO={nowISO}
        timeHM={timeHM}
        searchText={vs.searchText}
        onSearchChange={vs.setSearchText}
        availableTags={availableTags}
        selectedTags={vs.selectedTags}
        onToggleTag={vs.toggleTag}
        onClearFilters={vs.clearFilters}
        tagColors={tagColors}
        sortKey={vs.sortKey}
        sortOrder={vs.sortOrder}
        onChangeSortKey={vs.changeSortKey}
        onChangeSortOrder={vs.changeSortOrder}
        onResetSortToDefault={vs.resetSortToDefault}
        viewMode={vs.viewMode}
        onChangeViewMode={vs.changeViewMode}
        onResetViewModeToDefault={vs.resetViewModeToDefault}
        inTagsView={inTagsView}
        view={vs.view}
        onGoItems={() => {
          setExtraView(null);
          vs.goTo("items");
        }}
        onGoTags={() => {
          setExtraView("tags");
          vs.closeDrawer();
        }}
        onGoSettings={() => {
          setExtraView(null);
          vs.goTo("settings");
        }}
        onGoTrash={() => {
          setExtraView(null);
          vs.goTo("trash");
        }}
      />

      <Box sx={{ py: 3 }}>
        <Container maxWidth="sm">
          {inTagsView && (
            <TagsPage
              items={items}
              tagColors={tagColors}
              onSetTagColor={setTagColor}
              onRenameTag={renameTag}
              onRemoveTag={removeTag}
            />
          )}

          {!inTagsView && vs.view === "items" && (
            <ItemsView
							loading={loading}
							items={visibleActiveItems}
							nowISO={nowISO}
							nextDateMap={nextDateMap}
							tagColors={tagColors}
							settings={settings}
							viewMode={vs.viewMode}
							totalMonthlyRaw={totalMonthlyRaw}
							totalYearlyRaw={totalYearlyRaw}
							onClickItem={(it) => {
								setEditing(it);
								setDialogOpen(true);
							}}
							onAdd={() => {
								setEditing(undefined);
								setDialogOpen(true);
							}}
							onMarkPaid={(id, dueISO) => {
								const target = activeItems.find((x) => x.id === id);
								if (!target) return;
								update({ ...target, paidForDueISO: dueISO });
							}}
						/>
          )}

          {!inTagsView && vs.view === "trash" && (
            <TrashView
              items={visibleTrashItems}
              viewMode={vs.viewMode}
              onRestore={(id) => restore(id)}
              onRemoveForever={(id) => removeForever(id)}
            />
          )}

          {!inTagsView && vs.view === "settings" && (
            <SettingsPage
              settings={settings}
              actions={actions}
              onExport={handleExport}
              onImportFile={handleImportFile}
              origin={window.location.origin}
              dbName={DB_NAME}
              storeName={STORE_NAME}
              itemsCount={{
                active: activeItems.length,
                trash: trashItems.length,
                total: items.length,
              }}
            />
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
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ whiteSpace: "pre-line" }}
          >
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
