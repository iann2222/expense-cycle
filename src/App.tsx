import { useMemo, useState } from "react";
import type { SubscriptionItem } from "./types/models";
import type { SettingsV1 } from "./state/useSettings";
import { useItems, DB_NAME, STORE_NAME } from "./state/useItems";
import { useViewState } from "./state/useViewState";
import { computeNextDates } from "./utils/recurrence";

import {
  AppBar,
  Box,
  Container,
  IconButton,
  Snackbar,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { AppDrawer } from "./components/AppDrawer";
import { ItemDialog } from "./components/ItemDialog";
import { TagsPage } from "./views/TagsPage";
import { ItemsView } from "./views/ItemsView";
import { TrashView } from "./views/TrashView";
import { AnalysisPage } from "./views/AnalysisPage";

import { matchesSearch, matchesTagsOR } from "./utils/search";
import { compareItemsWithNext, type NextDates } from "./utils/sort";
import { SettingsPage } from "./views/SettingsPage";

import { useTagColors } from "./state/useTagColors";
import { useTagOps } from "./state/useTagOps";
import { useNowUTC8 } from "./state/useNowUTC8";
import { ImportResultDialog } from "./components/ImportResultDialog";

import { useTzWarningUTC8 } from "./state/useTzWarningUTC8";
import { TzWarningDialog } from "./components/TzWarningDialog";

import { useBackup } from "./state/useBackup";

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

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionItem | undefined>(
    undefined
  );

  // tag colors (moved to hook)
  const { tagColors, setTagColor, replaceAll, tagOrder, setTagOrder } =
    useTagColors();

  // now/time (UTC+8) (moved to hook)
  const { nowISO, timeHM } = useNowUTC8();

  // tag edit ops (moved to hook)
  const { renameTag, removeTag } = useTagOps({
    items,
    update,
    tagColors,
    replaceTagColors: replaceAll,
    tagOrder,
    setTagOrder,
  });

  // timezone warning (moved to hook + component)
  const tz = useTzWarningUTC8();

  // backup export/import (moved to hook)
  const backup = useBackup({
    exportBackup,
    importBackupReplace,
    tagColors,
    replaceTagColors: replaceAll,
    onImportDone: () => {
      vs.goTo("items");
    },
  });

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

  const inTagsView = vs.view === "tags";

  const appTitle = (() => {
    if (vs.view === "tags") return "標籤管理";
    if (vs.view === "analysis") return "分析報表";
    if (vs.view === "settings") return "設定";
    if (vs.view === "trash") return "回收桶";
    return "ExpenseCycle"; // items 首頁
  })();

  function handleTopLeftClick() {
    // tags / analysis / settings / trash：左上角 = 回首頁
    if (vs.view !== "items") {
      vs.goTo("items");
      return;
    }
    // items：左上角 = 開選單
    vs.openDrawer();
  }

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={(theme) => ({
          bgcolor:
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.04)" // 深色主題：保留你原本的霧面效果
              : "#4d83daff", // 淺色主題：指定底色

          color: "#ffffffff",

          backdropFilter:
            theme.palette.mode === "dark" ? "saturate(180%) blur(6px)" : "none", // 淺色通常不需要霧化，可留可不留

          borderBottom: "1px solid",
          borderColor:
            theme.palette.mode === "dark" ? "divider" : "transparent", // 淺色底色固定時通常不需要底線
        })}
      >
        <Toolbar>
          <IconButton
            edge="start"
            sx={{
              mr: 1,
              color: "#fff", // 強制圖示為白色
            }}
            onClick={handleTopLeftClick}
          >
            {vs.view !== "items" ? <ArrowBackIcon /> : <MenuIcon />}
          </IconButton>

          <Typography
            variant="h6"
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            {appTitle}
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
          vs.goTo("items");
        }}
        onGoTags={() => {
          vs.goTo("tags");
        }}
        onGoAnalysis={() => {
          vs.goTo("analysis");
        }}
        onGoSettings={() => {
          vs.goTo("settings");
        }}
        onGoTrash={() => {
          vs.goTo("trash");
        }}
      />

      <Box sx={{ py: 3 }}>
        <Container maxWidth="sm">
          {vs.view === "tags" && (
            <TagsPage
              items={items}
              tagColors={tagColors}
              tagOrder={tagOrder}
              onReorderTags={setTagOrder}
              onSetTagColor={setTagColor}
              onRenameTag={renameTag}
              onRemoveTag={removeTag}
            />
          )}

          {vs.view === "items" && (
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

          {vs.view === "analysis" && <AnalysisPage items={activeItems} />}

          {vs.view === "trash" && (
            <TrashView
              items={visibleTrashItems}
              viewMode={vs.viewMode}
              onRestore={(id) => restore(id)}
              onRemoveForever={(id) => removeForever(id)}
            />
          )}

          {vs.view === "settings" && (
            <SettingsPage
              settings={settings}
              actions={actions}
              onExport={backup.exportToFile}
              onImportFile={backup.importFromFile}
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
        onSubmit={async (item) => {
          if (editing?.deletedAtISO) {
            item.deletedAtISO = editing.deletedAtISO;
            item.purgeAfterISO = editing.purgeAfterISO;
          }
          if (editing) await update(item);
          else await add(item);
        }}
        onMoveToTrash={(id) => {
          void softDelete(id);
        }}
      />

      {/* 匯入結果：改用 component */}
      <ImportResultDialog
        open={backup.result.open}
        success={backup.result.success}
        message={backup.result.message}
        onClose={backup.closeResult}
      />

      {/* 時區提醒：改用 hook + component */}
      <TzWarningDialog
        open={tz.open}
        tzInfo={tz.tzInfo}
        onClose={tz.close}
        onDismissToday={tz.dismissToday}
      />

      <Snackbar
				open={vs.backHintOpen}
				autoHideDuration={1500}
				onClose={vs.closeBackHint}
				message="再按一次返回鍵後退出"
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
				slotProps={{
					content: {
						sx: {
							width: "auto",
							maxWidth: "fit-content",
							mx: "auto",
							textAlign: "center",
							display: "flex",
							justifyContent: "center",
							borderRadius: 999,
							px: 2,
							py: 0.5,
						},
					},
				}}
			/>
    </>
  );
}
