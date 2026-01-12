import * as React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { SubscriptionItem } from "../types/models";

export type TagColors = Record<string, string>;

function countTags(items: SubscriptionItem[]) {
  const map = new Map<string, number>();
  for (const it of items) {
    for (const t of it.tags || []) map.set(t, (map.get(t) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-Hant"));
}

// 簡單、安全的顏色候選（你也可以之後換成色盤）
const COLOR_PRESETS = [
  "#1a73e8", // Google Blue
  "#34a853", // Green
  "#fbbc05", // Yellow
  "#ea4335", // Red
  "#9334e6", // Purple
  "#12b5cb", // Cyan
  "#5f6368", // Grey
];

export function TagsView({
  items, // 建議用 active+trash 全部 items，避免回收桶 restore 後顏色/改名不一致
  tagColors,
  onSetTagColor,
  onRenameTag,
  onRemoveTag,
}: {
  items: SubscriptionItem[];
  tagColors: TagColors;
  onSetTagColor: (tag: string, color: string) => void;
  onRenameTag: (oldTag: string, newTag: string) => Promise<void>;
  onRemoveTag: (tag: string) => Promise<void>;
}) {
  const rows = React.useMemo(() => countTags(items), [items]);

  const [open, setOpen] = React.useState(false);
  const [currentTag, setCurrentTag] = React.useState<string>("");
  const [newName, setNewName] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);

  // ✅ 移除確認 Dialog state（取代 window.confirm）
  const [removeConfirmOpen, setRemoveConfirmOpen] = React.useState(false);
  const pendingRemoveTag = currentTag; // 這支頁面是「在編輯某個 tag 時」才會移除，所以用 currentTag 即可

  // ✅ 完整沿用原本 confirm 的文字（完全不改）
  const REMOVE_CONFIRM_TEXT = `確定要移除標籤「${pendingRemoveTag}」？
（只會從所有項目移除該標籤，不刪除項目本身）`;

  function openEditor(tag: string) {
    setCurrentTag(tag);
    setNewName(tag);
    setOpen(true);
  }

  async function doRename() {
    const next = newName.trim();
    if (!next) return;
    if (next === currentTag) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      await onRenameTag(currentTag, next);
      // 顏色也跟著搬家
      const c = tagColors[currentTag];
      if (c && !tagColors[next]) onSetTagColor(next, c);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  // ✅ 改成只打開 MUI Dialog（不再 confirm）
  function requestRemove() {
    setRemoveConfirmOpen(true);
  }

  // ✅ 真正執行移除（在 Dialog 的「確認/移除」按鈕上呼叫）
  async function confirmRemove() {
    if (!pendingRemoveTag) return;
    setBusy(true);
    try {
      await onRemoveTag(pendingRemoveTag);
      setRemoveConfirmOpen(false);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function closeRemoveDialog() {
    if (busy) return;
    setRemoveConfirmOpen(false);
  }

  return (
    <Box>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">標籤管理</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            你可以在這裡調整標籤顏色、全域改名或移除標籤（不會刪除項目）。
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={1.5}>
            {rows.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                尚無標籤。你可以先在某個項目新增標籤。
              </Typography>
            )}

            {rows.map(({ tag, count }) => {
              const color = tagColors[tag];
              return (
                <Stack
                  key={tag}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ minWidth: 0 }}
                  >
                    <Chip
                      label={tag}
                      variant={color ? "filled" : "outlined"}
                      sx={{
                        bgcolor: color || undefined,
                        color: color ? "#fff" : undefined,
                        maxWidth: 180,
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {count}
                    </Typography>
                  </Stack>

                  <Button size="small" onClick={() => openEditor(tag)}>
                    編輯
                  </Button>
                </Stack>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      {/* 編輯標籤 Dialog */}
      <Dialog
        open={open}
        onClose={() => (busy ? null : setOpen(false))}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>編輯標籤</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            標籤：{currentTag}
          </Typography>

          <TextField
            fullWidth
            label="重新命名"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 2 }}
            disabled={busy}
          />

          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            顏色
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
            {COLOR_PRESETS.map((c) => (
              <Chip
                key={c}
                label=" "
                onClick={() => onSetTagColor(currentTag, c)}
                sx={{
                  bgcolor: c,
                  width: 36,
                  height: 28,
                  borderRadius: 999,
                }}
              />
            ))}
            <Chip
              label="清除顏色"
              variant="outlined"
              onClick={() => onSetTagColor(currentTag, "")}
            />
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" color="text.secondary">
            移除標籤會把它從所有項目中拿掉（項目本身不會刪除）。
          </Typography>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
          {/* 左下 */}
          <Button color="error" onClick={requestRemove} disabled={busy}>
            移除標籤
          </Button>

          {/* 右下 */}
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setOpen(false)} disabled={busy}>
              取消
            </Button>
            <Button variant="contained" onClick={doRename} disabled={busy}>
              儲存
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* 移除標籤 */}
      <Dialog open={removeConfirmOpen} onClose={closeRemoveDialog}>
        <DialogTitle>移除標籤</DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ whiteSpace: "pre-line" }}
          >
            {REMOVE_CONFIRM_TEXT}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRemoveDialog} disabled={busy}>
            取消
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmRemove}
            disabled={busy}
          >
            移除標籤
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
