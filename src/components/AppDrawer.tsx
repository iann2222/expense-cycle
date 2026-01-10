import type { DefaultViewMode, SortKey, SortOrder } from "../state/useSettings";
import type { TagColors } from "./TagsView";

import {
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
} from "@mui/material";

import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import SettingsIcon from "@mui/icons-material/Settings";
import LabelIcon from "@mui/icons-material/Label";

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
  view: "items" | "trash" | "settings";
  onGoItems: () => void;
  onGoTags: () => void;
  onGoSettings: () => void;
  onGoTrash: () => void;
}) {
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
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            選單
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            時間：{nowISO} {timeHM} (UTC+8)
          </Typography>

          <TextField
            size="small"
            fullWidth
            label="搜尋（名稱 / 標籤 / 備註）"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            sx={{ mt: 1.5 }}
          />

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

            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
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
                    variant={
                      selected ? "filled" : color ? "filled" : "outlined"
                    }
                    onClick={() => onToggleTag(tag)}
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
            selected={!inTagsView && view === "items"}
            onClick={onGoItems}
          >
            <ListItemText primary="全部項目" />
          </ListItemButton>

          <ListItemButton selected={inTagsView} onClick={onGoTags}>
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
