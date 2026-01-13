import * as React from "react";
import {
  alpha,
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
  useTheme,
} from "@mui/material";
import type { SubscriptionItem } from "../types/models";
import { pickReadableTextColor, shiftRgb } from "../utils/colors";

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

const COLOR_PRESETS = [
  "#E56B70",
  "#4d9d5aff",
  "#297373",
  "#1c99ffff",
  "#2d4dd9ff",
  "#7678ed",
  "#84714F",
  "#565656ff",
];

export function TagsView({
  items,
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
  const theme = useTheme();
  const rows = React.useMemo(() => countTags(items), [items]);

  const [open, setOpen] = React.useState(false);
  const [currentTag, setCurrentTag] = React.useState<string>("");
  const [newName, setNewName] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);

  const [removeConfirmOpen, setRemoveConfirmOpen] = React.useState(false);
  const pendingRemoveTag = currentTag;

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
      const c = tagColors[currentTag];
      if (c && !tagColors[next]) onSetTagColor(next, c);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function requestRemove() {
    setRemoveConfirmOpen(true);
  }

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
              const readable = color ? pickReadableTextColor(color) : undefined;

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
                        color: color ? readable : undefined,
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

          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 1, flexWrap: "wrap", rowGap: 1 }}
          >
            {COLOR_PRESETS.map((c) => {
              const selected = tagColors[currentTag] === c;
              const textColor = pickReadableTextColor(c);

              // 不用邊框：用「縮放 + 透明度 + ✓」表示選取
              const baseOpacity = selected ? 1 : 0.92;

              const hoverBg =
                theme.palette.mode === "dark" ? shiftRgb(c, 0.12) : shiftRgb(c, -0.08);

              return (
                <Chip
                  key={c}
                  label={selected ? "✓" : " "}
                  onClick={() => onSetTagColor(currentTag, c)}
                  sx={{
                    bgcolor: c,
                    color: textColor,
                    width: 44,
                    height: 32,
                    borderRadius: 999,
                    fontWeight: 700,
                    userSelect: "none",

                    // ✅ 完全不要邊框
                    border: "none",
                    boxShadow: "none",

                    opacity: baseOpacity,
                    transform: selected ? "scale(1.06)" : "scale(1.0)",
                    transition:
                      "transform 120ms ease, opacity 120ms ease, background-color 120ms ease",

                    "&:hover": {
                      bgcolor: hoverBg,
                      opacity: 1,
                    },
                    "&:active": {
                      transform: selected ? "scale(1.03)" : "scale(0.98)",
                    },
                  }}
                />
              );
            })}

            <Chip
              label="清除顏色"
              variant="outlined"
              onClick={() => onSetTagColor(currentTag, "")}
              sx={{
                height: 32,
                borderRadius: 999,
                bgcolor:
                  theme.palette.mode === "dark"
                    ? alpha(theme.palette.common.white, 0.06)
                    : alpha(theme.palette.common.black, 0.04),
                "&:hover": {
                  bgcolor: alpha(
                    theme.palette.text.primary,
                    theme.palette.mode === "dark" ? 0.08 : 0.06
                  ),
                },
              }}
            />
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" color="text.secondary">
            移除標籤會把它從所有項目中拿掉（項目本身不會刪除）。
          </Typography>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
          <Button color="error" onClick={requestRemove} disabled={busy}>
            移除標籤
          </Button>

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
