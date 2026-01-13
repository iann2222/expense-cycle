import * as React from "react";
import type { DefaultViewMode, SortKey, SortOrder } from "../state/useSettings";
import type { TagColors } from "./TagsView";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
  ListItemIcon,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ViewListIcon from "@mui/icons-material/ViewList";
import LabelIcon from "@mui/icons-material/Label";
import BarChartIcon from "@mui/icons-material/BarChartRounded";
import SettingsIcon from "@mui/icons-material/Settings";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";

export function AppDrawer({
  open,
  onClose,

  nowISO,
  timeHM,

  searchText,
  onSearchChange,

  availableTags,
  selectedTags,
  onToggleTag,
  onClearFilters,
  tagColors,

  sortKey,
  sortOrder,
  onChangeSortKey,
  onChangeSortOrder,
  onResetSortToDefault,

  viewMode,
  onChangeViewMode,
  onResetViewModeToDefault,

  // navigation
  inTagsView,
  view,
  onGoItems,
  onGoTags,
  onGoAnalysis,
  onGoSettings,
  onGoTrash,
}: {
  open: boolean;
  onClose: () => void;

  nowISO: string;
  timeHM: string;

  searchText: string;
  onSearchChange: (v: string) => void;

  availableTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearFilters: () => void;
  tagColors: TagColors;

  sortKey: SortKey;
  sortOrder: SortOrder;
  onChangeSortKey: (k: SortKey) => void;
  onChangeSortOrder: (o: SortOrder) => void;
  onResetSortToDefault: () => void;

  viewMode: DefaultViewMode;
  onChangeViewMode: (m: DefaultViewMode) => void;
  onResetViewModeToDefault: () => void;

  inTagsView: boolean;
  view: "items" | "trash" | "settings" | "analysis";
  onGoItems: () => void;
  onGoTags: () => void;
  onGoAnalysis: () => void;
  onGoSettings: () => void;
  onGoTrash: () => void;
}) {
  const showItemTools = !inTagsView && view === "items";

  // ✅ 控制「全部項目工具」展開/收起（綁在全部項目上）
  const [itemsToolsOpen, setItemsToolsOpen] = React.useState<boolean>(true);

  // 當離開 items 頁時，自動收起（避免在別頁也看到展開狀態）
  React.useEffect(() => {
    if (!showItemTools) setItemsToolsOpen(false);
  }, [showItemTools]);

  return (
    <Drawer open={open} onClose={onClose}>
      <Box
        sx={{
          width: 280,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* ===== 標題 / 狀態 ===== */}
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            選單
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {nowISO} {timeHM}（UTC+8）
          </Typography>
        </Box>

        <Divider />

        {/* ===== 導航區：把「全部項目」做成 Accordion 的 Summary（右側有箭頭）===== */}
        <Accordion
          disableGutters
          elevation={0}
          expanded={showItemTools && itemsToolsOpen}
          onChange={(_, expanded) => {
            if (!showItemTools) return;
            setItemsToolsOpen(expanded);
          }}
          sx={{ "&:before": { display: "none" } }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            component={ListItemButton}
            selected={!inTagsView && view === "items"}
            onClick={() => {
              // 點整列：先導到 items（若不在 items），再由 onChange 決定要不要展開
              if (inTagsView || view !== "items") onGoItems();
            }}
            sx={{
              px: 2,
              minHeight: 48,
              "& .MuiAccordionSummary-content": { my: 0, alignItems: "center" },
              "& .MuiAccordionSummary-expandIconWrapper": {
                color: "text.secondary",
              },

              // 移除 Accordion 自帶底色，只留 ListItemButton 的
              bgcolor: "transparent",
              "&.Mui-expanded": {
                bgcolor: "transparent",
              },
              "&:hover": {
                bgcolor: "action.hover",
              },
              "&.Mui-selected": {
                bgcolor: "action.selected",
              },
              "&.Mui-selected:hover": {
                bgcolor: "action.selected",
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <ViewListIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="首頁" />
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 0, pb: 1.5 }}>
            {/* 搜尋 */}
            <Box sx={{ px: 2, pt: 1 }}>
              <TextField
                size="small"
                fullWidth
                label="搜尋（名稱 / 標籤 / 備註）"
                value={searchText}
                onChange={(e) => onSearchChange(e.target.value)}
              />

              {/* 標籤篩選 */}
              <Box sx={{ mt: 1.5 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="baseline"
                >
                  <Typography variant="body2" color="text.secondary">
                    依標籤篩選（多選）
                  </Typography>
                  <Button size="small" onClick={onClearFilters}>
                    清除
                  </Button>
                </Stack>

                <Box
                  sx={{
                    mt: 1,
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 1,           // 同時控制水平+垂直間距
                  }}
                >
                  {availableTags.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      尚無標籤
                    </Typography>
                  )}

                  {availableTags.map((tag) => {
                    const selected = selectedTags.includes(tag);
                    const color = tagColors[tag];

                    return (
                      <Chip
                        key={tag}
                        label={tag}
                        clickable
                        color={selected ? "primary" : "default"}
                        variant={selected ? "filled" : color ? "filled" : "outlined"}
                        onClick={() => onToggleTag(tag)}
                        sx={{
                          bgcolor: selected ? undefined : color || undefined,
                          color: selected ? undefined : color ? "#fff" : undefined,
                        }}
                      />
                    );
                  })}
                </Box>

              </Box>

              <Divider sx={{ my: 2 }} />

              {/* 排序 */}
              <Typography variant="overline" color="text.secondary">
                排序
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 1, flexWrap: "wrap" }}
              >
                <Chip
                  label="到期日"
                  clickable
                  color={sortKey === "dueDate" ? "primary" : "default"}
                  variant={sortKey === "dueDate" ? "filled" : "outlined"}
                  onClick={() => onChangeSortKey("dueDate")}
                />
                <Chip
                  label="金額"
                  clickable
                  color={sortKey === "amount" ? "primary" : "default"}
                  variant={sortKey === "amount" ? "filled" : "outlined"}
                  onClick={() => onChangeSortKey("amount")}
                />
                <Chip
                  label="名稱"
                  clickable
                  color={sortKey === "name" ? "primary" : "default"}
                  variant={sortKey === "name" ? "filled" : "outlined"}
                  onClick={() => onChangeSortKey("name")}
                />
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip
                  label="小 → 大"
                  clickable
                  color={sortOrder === "asc" ? "primary" : "default"}
                  variant={sortOrder === "asc" ? "filled" : "outlined"}
                  onClick={() => onChangeSortOrder("asc")}
                />
                <Chip
                  label="大 → 小"
                  clickable
                  color={sortOrder === "desc" ? "primary" : "default"}
                  variant={sortOrder === "desc" ? "filled" : "outlined"}
                  onClick={() => onChangeSortOrder("desc")}
                />
              </Stack>

              <Button
                size="small"
                sx={{ mt: 1, px: 0, justifyContent: "flex-start" }}
                onClick={onResetSortToDefault}
              >
                回復預設
              </Button>

              <Divider sx={{ my: 2 }} />

              {/* 統計口徑 */}
              <Typography variant="overline" color="text.secondary">
                統計口徑
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip
                  label="依原週期"
                  clickable
                  color={viewMode === "original" ? "primary" : "default"}
                  variant={viewMode === "original" ? "filled" : "outlined"}
                  onClick={() => onChangeViewMode("original")}
                />
                <Chip
                  label="月"
                  clickable
                  color={viewMode === "monthly" ? "primary" : "default"}
                  variant={viewMode === "monthly" ? "filled" : "outlined"}
                  onClick={() => onChangeViewMode("monthly")}
                />
                <Chip
                  label="年"
                  clickable
                  color={viewMode === "yearly" ? "primary" : "default"}
                  variant={viewMode === "yearly" ? "filled" : "outlined"}
                  onClick={() => onChangeViewMode("yearly")}
                />
              </Stack>

              <Button
                size="small"
                sx={{ mt: 1, px: 0, justifyContent: "flex-start" }}
                onClick={onResetViewModeToDefault}
              >
                回復預設
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>

        <Divider />

        {/* ===== 其餘導航（會被 Accordion 展開推到下面）===== */}
        <List>
          <ListItemButton selected={inTagsView} onClick={onGoTags}>
            <LabelIcon fontSize="small" style={{ marginRight: 12 }} />
            <ListItemText primary="標籤管理" />
          </ListItemButton>

          <ListItemButton
            selected={!inTagsView && view === "analysis"}
            onClick={() => {
              onGoAnalysis();
              onClose();
            }}
          >
            <BarChartIcon fontSize="small" style={{ marginRight: 12 }} />
            <ListItemText primary="分析報表" />
          </ListItemButton>
        </List>

        {/* ===== 底部：設定 / 回收桶 ===== */}
        <Box sx={{ mt: "auto" }}>
          <Divider />
          <List>
            <ListItemButton
              selected={!inTagsView && view === "settings"}
              onClick={onGoSettings}
            >
              <SettingsIcon fontSize="small" style={{ marginRight: 12 }} />
              <ListItemText primary="設定" />
            </ListItemButton>

            <ListItemButton
              selected={!inTagsView && view === "trash"}
              onClick={onGoTrash}
            >
              <RestoreFromTrashIcon
                fontSize="small"
                style={{ marginRight: 12 }}
              />
              <ListItemText primary="回收桶" secondary="30 天後自動清除" />
            </ListItemButton>
          </List>
        </Box>
      </Box>
    </Drawer>
  );
}
