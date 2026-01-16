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
  IconButton,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import type { SubscriptionItem } from "../types/models";
import { pickReadableTextColor, shiftRgb } from "../utils/colors";
import { useModalBackHandler } from "../state/useModalBackHandler";

import DragHandleIcon from "@mui/icons-material/DragHandle";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type TagColors = Record<string, string>;

function countTags(items: SubscriptionItem[]) {
  const map = new Map<string, number>();
  for (const it of items) {
    for (const t of it.tags || []) map.set(t, (map.get(t) || 0) + 1);
  }
  return map;
}

function SortableTagRow({
  id,
  children,
}: {
  id: string;
  children: (args: {
    setActivatorNodeRef: (node: HTMLElement | null) => void;
    listeners?: DraggableSyntheticListeners;
    attributes: Record<string, any>;
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        ...(isDragging
          ? {
              bgcolor: "background.paper",
              borderRadius: 1,
              boxShadow: 3,
            }
          : {}),
      }}
    >
      {children({
        setActivatorNodeRef,
        listeners, // ✅ 直接傳下去（可為 undefined）
        attributes: attributes as Record<string, any>,
        isDragging,
      })}
    </Box>
  );
}

const COLOR_PRESETS = [
  "#E64755",
  "#1C99FF",
  "#3251deff",
  "#6B69D6",
  "#00A0C6",
  "#018574",
  "#84714F",
  "#535455cd",
] as const;

export function TagsView({
  items,
  tagColors,
  tagOrder,
  onReorderTags,
  onSetTagColor,
  onRenameTag,
  onRemoveTag,
}: {
  items: SubscriptionItem[];
  tagColors: TagColors;

  tagOrder: string[];
  onReorderTags: (next: string[]) => void;

  onSetTagColor: (tag: string, color: string) => void;
  onRenameTag: (oldTag: string, newTag: string) => Promise<void>;
  onRemoveTag: (tag: string) => Promise<void>;
}) {
  const theme = useTheme();
  const countMap = React.useMemo(() => countTags(items), [items]);

  // 依 tagOrder 決定顯示順序（拖動排序的來源）
  const rows = React.useMemo(() => {
    const order = (tagOrder || []).filter((t) => countMap.has(t));
    return order.map((tag) => ({ tag, count: countMap.get(tag) || 0 }));
  }, [countMap, tagOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 }, // 手機端：長按才開始拖，避免跟捲動衝突
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [open, setOpen] = React.useState(false);
  const [currentTag, setCurrentTag] = React.useState<string>("");
  const [newName, setNewName] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);

  const [removeConfirmOpen, setRemoveConfirmOpen] = React.useState(false);
  const pendingRemoveTag = currentTag;

  // Android 返回鍵：標籤編輯 / 確認視窗都視為「取消」
  useModalBackHandler(open, () => setOpen(false), "tags-edit");


  useModalBackHandler(
    removeConfirmOpen,
    () => setRemoveConfirmOpen(false),
    "tags-remove"
  );

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

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const a = String(active.id);
    const b = String(over.id);
    if (a === b) return;

    const oldIndex = tagOrder.indexOf(a);
    const newIndex = tagOrder.indexOf(b);
    if (oldIndex < 0 || newIndex < 0) return;

    onReorderTags(arrayMove(tagOrder, oldIndex, newIndex));
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

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={rows.map((r) => r.tag)}
                strategy={verticalListSortingStrategy}
              >
                {rows.map(({ tag, count }) => {
                  const color = tagColors[tag];
                  const readable = color
                    ? pickReadableTextColor(color)
                    : undefined;

                  return (
                    <SortableTagRow key={tag} id={tag}>
                      {({
                        setActivatorNodeRef,
                        listeners,
                        attributes,
                        isDragging,
                      }) => (
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          spacing={1}
                          sx={{
                            px: 0.5,
                            py: 0.25,
                            ...(isDragging ? { opacity: 0.9 } : {}),
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ minWidth: 0 }}
                          >
                            {/* 拖動把手：只綁在 icon 上 */}
                            <IconButton
                              size="small"
                              ref={setActivatorNodeRef}
                              {...(listeners ?? {})}
                              {...attributes}
                              sx={{
                                cursor: "grab",
                                color: "text.secondary",

                                // 手機端關鍵：不要讓瀏覽器把觸控當成滾動/點擊手勢吃掉
                                touchAction: "none",
                                userSelect: "none",
                                WebkitUserSelect: "none",

                                // 有些手機會長按跳出選單/拖圖片等，順手關掉
                                WebkitTouchCallout: "none",
                                "&:active": { cursor: "grabbing" },
                              }}
                            >
                              <DragHandleIcon fontSize="small" />
                            </IconButton>

                            <Chip
                              label={tag}
                              variant={color ? "filled" : "outlined"}
                              sx={(theme) => ({
                                maxWidth: 180,
                                ...(color
                                  ? {
                                      bgcolor: color,
                                      color: readable,
                                    }
                                  : theme.palette.mode === "dark"
                                  ? {
                                      bgcolor: "transparent",
                                      border: `1px solid ${alpha(
                                        theme.palette.common.white,
                                        0.32
                                      )}`,
                                      color: theme.palette.common.white,
                                    }
                                  : {}),
                              })}
                            />

                            <Typography variant="body2" color="text.secondary">
                              {count}
                            </Typography>
                          </Stack>

                          <Button size="small" onClick={() => openEditor(tag)}>
                            編輯
                          </Button>
                        </Stack>
                      )}
                    </SortableTagRow>
                  );
                })}
              </SortableContext>
            </DndContext>
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

              const baseOpacity = selected ? 1 : 0.92;

              const hoverBg =
                theme.palette.mode === "dark"
                  ? shiftRgb(c, 0.12)
                  : shiftRgb(c, -0.08);

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
