import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Popover,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useMediaQuery, useTheme } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import type { SubscriptionItem } from "../types/models";
import { computeNextDates } from "../utils/recurrence";
import { safeUUID } from "../utils/uuid";
import { useModalBackHandler } from "../state/useModalBackHandler";

const TZ = "Asia/Taipei";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function todayISO() {
  // en-CA 會輸出 YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseISO(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return { y: 2026, m: 1, d: 1 };
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function toISO(y: number, m: number, d: number) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

// 星期幾
function weekdayZh(iso: string) {
  const { y, m, d } = parseISO(iso);

  // 用 UTC 的中午建 Date，避免任何時區換算造成日期落在前/後一天
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));

  const w = new Intl.DateTimeFormat("zh-TW", {
    timeZone: TZ,
    weekday: "short",
  }).format(date);

  return w.replace(/^週/, "");
}

function uniqTags(tags: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const v = t.trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function DateFieldPopover({
  label,
  valueISO,
  onChangeISO,
  showWeekdayInDayPicker,
}: {
  label: string;
  valueISO: string;
  onChangeISO: (iso: string) => void;
  showWeekdayInDayPicker: boolean;
}) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const { y, m, d } = React.useMemo(() => parseISO(valueISO), [valueISO]);

  const years = React.useMemo(() => {
    const now = new Date().getFullYear();
    const start = now - 10;
    const end = now + 10;
    const arr: number[] = [];
    for (let yy = start; yy <= end; yy++) arr.push(yy);
    return arr;
  }, []);

  const maxD = React.useMemo(() => daysInMonth(y, m), [y, m]);
  const days = React.useMemo(
    () => Array.from({ length: maxD }, (_, i) => i + 1),
    [maxD]
  );

  function open(e: React.MouseEvent<HTMLElement>) {
    setAnchorEl(e.currentTarget);
  }
  function close() {
    setAnchorEl(null);
  }

  function setY(nextY: number) {
    const nextMax = daysInMonth(nextY, m);
    const nextD = Math.min(d, nextMax);
    onChangeISO(toISO(nextY, m, nextD));
  }
  function setM(nextM: number) {
    const nextMax = daysInMonth(y, nextM);
    const nextD = Math.min(d, nextMax);
    onChangeISO(toISO(y, nextM, nextD));
  }
  function setD(nextD: number) {
    onChangeISO(toISO(y, m, nextD));
  }

  const display = `${valueISO}（${weekdayZh(valueISO)}）`;

  return (
    <Box>
      <TextField
        label={label}
        value={display}
        fullWidth
        slotProps={{
          input: { readOnly: true },
        }}
        onClick={open}
      />

      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2, width: 340 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {label}：{display}
          </Typography>

          <Stack direction="row" spacing={1}>
            <TextField
              select
              size="small"
              value={y}
              onChange={(e) => setY(Number(e.target.value))}
              sx={{ flex: 1 }}
            >
              {years.map((yy) => (
                <MenuItem key={yy} value={yy}>
                  {yy} 年
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              value={m}
              onChange={(e) => setM(Number(e.target.value))}
              sx={{ flex: 1 }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => (
                <MenuItem key={mm} value={mm}>
                  {mm} 月
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              value={d}
              onChange={(e) => setD(Number(e.target.value))}
              sx={{ flex: 1 }}
            >
              {days.map((dd) => {
                const iso = toISO(y, m, dd);
                const labelText = showWeekdayInDayPicker
                  ? `${dd}（${weekdayZh(iso)}）`
                  : `${dd}`;
                return (
                  <MenuItem key={dd} value={dd}>
                    {labelText}
                  </MenuItem>
                );
              })}
            </TextField>
          </Stack>

          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button onClick={close}>完成</Button>
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
}

export function ItemDialog({
  open,
  initialItem,
  onClose,
  onSubmit,
  onMoveToTrash,
  showWeekdayInDayPicker,
  nowISO,
}: {
  open: boolean;
  initialItem?: SubscriptionItem;
  onClose: () => void;
  onSubmit: (item: SubscriptionItem) => Promise<void>;
  onMoveToTrash: (id: string) => void;
  showWeekdayInDayPicker: boolean;
  nowISO: string;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState<string>("");
  const [cycle, setCycle] = React.useState<"monthly" | "yearly">("monthly");
  const [payableFromISO, setPayableFromISO] = React.useState(todayISO());
  const [dueDateISO, setDueDateISO] = React.useState(todayISO());
  const baselineDatesRef = React.useRef<{ payable: string; due: string }>({
    payable: "",
    due: "",
  });
  const [paymentMethod, setPaymentMethod] = React.useState("");
  const [needsAttention, setNeedsAttention] = React.useState(true);

  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // 錯誤訊息（只在失敗時顯示）
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // dirty confirm（點外面/ESC）
  const initialSnapshotRef = React.useRef<string>("");
  const [dirtyConfirmOpen, setDirtyConfirmOpen] = React.useState(false);

  // 日期覆蓋確認（只在編輯且日期變更時）
  const [dateConfirmOpen, setDateConfirmOpen] = React.useState(false);

  // 移除確認（MUI Dialog，取代 confirm）
  const [trashConfirmOpen, setTrashConfirmOpen] = React.useState(false);

  // input ref
  const nameInputRef = React.useRef<HTMLInputElement | null>(null);

  const pendingValidatedRef = React.useRef<{
    finalName: string;
    amountInt: number;
  } | null>(null);

  React.useEffect(() => {
    if (!open) return;

    setSaveError(null);
    pendingValidatedRef.current = null;

    if (initialItem) {
      const next = computeNextDates(initialItem, nowISO);

      const init = {
        name: initialItem.name,
        amount: String(initialItem.amount),
        cycle: initialItem.cycle,
        payableFromISO: next.nextPayable,
        dueDateISO: next.nextDue,
        paymentMethod: initialItem.paymentMethod || "",
        needsAttention: initialItem.needsAttention ?? true,
        tags: uniqTags(initialItem.tags || []),
        notes: initialItem.notes || "",
      };

      setName(init.name);
      setAmount(init.amount);
      setCycle(init.cycle);
      setPayableFromISO(init.payableFromISO);
      setDueDateISO(init.dueDateISO);
      setPaymentMethod(init.paymentMethod);
      setNeedsAttention(init.needsAttention);
      setTags(init.tags);
      setTagInput("");
      setNotes(init.notes);

      baselineDatesRef.current = {
        payable: init.payableFromISO,
        due: init.dueDateISO,
      };

      initialSnapshotRef.current = JSON.stringify({
        ...init,
        name: init.name.trim(),
        amount: init.amount.trim(),
        paymentMethod: init.paymentMethod.trim(),
        tags: uniqTags(init.tags),
        notes: init.notes.trim(),
      });
    } else {
      const init = {
        name: "",
        amount: "",
        cycle: "monthly" as const,
        payableFromISO: nowISO,
        dueDateISO: nowISO,
        paymentMethod: "",
        needsAttention: true,
        tags: [] as string[],
        notes: "",
      };

      setName(init.name);
      setAmount(init.amount);
      setCycle(init.cycle);
      setPayableFromISO(init.payableFromISO);
      setDueDateISO(init.dueDateISO);
      setPaymentMethod(init.paymentMethod);
      setNeedsAttention(init.needsAttention);
      setTags(init.tags);
      setTagInput("");
      setNotes(init.notes);

      baselineDatesRef.current = {
        payable: init.payableFromISO,
        due: init.dueDateISO,
      };

      initialSnapshotRef.current = JSON.stringify({
        ...init,
        name: init.name.trim(),
        amount: init.amount.trim(),
        paymentMethod: init.paymentMethod.trim(),
        tags: uniqTags(init.tags),
        notes: init.notes.trim(),
      });
    }

    setDirtyConfirmOpen(false);
    setDateConfirmOpen(false);
    setTrashConfirmOpen(false);

    if (!isMobile) {
      requestAnimationFrame(() => {
        const el = nameInputRef.current;
        if (el && el.value === "(未命名)") el.select();
      });
    }
  }, [open, initialItem, nowISO, isMobile]);

  function currentSnapshot() {
    return JSON.stringify({
      name: name.trim(),
      amount: amount.trim(),
      cycle,
      payableFromISO,
      dueDateISO,
      paymentMethod: paymentMethod.trim(),
      needsAttention,
      tags: uniqTags(tags),
      notes: notes.trim(),
    });
  }

  function isDirty() {
    return currentSnapshot() !== initialSnapshotRef.current;
  }

  function buildItem(applyDates: boolean): SubscriptionItem {
    const basePayable = initialItem?.payableFromISO ?? payableFromISO;
    const baseDue = initialItem?.dueDateISO ?? dueDateISO;

    return {
      id: initialItem?.id || safeUUID(),
      name: name.trim() || "(未命名)",
      amount: Number(amount) || 0,
      currency: "TWD",
      cycle,
      payableFromISO: applyDates ? payableFromISO : basePayable,
      dueDateISO: applyDates ? dueDateISO : baseDue,
      paidForDueISO: initialItem?.paidForDueISO,
      paymentMethod: paymentMethod.trim(),
      needsAttention,
      tags: uniqTags(tags),
      notes: notes.trim() || undefined,
    };
  }

  function datesChanged() {
    return (
      payableFromISO !== baselineDatesRef.current.payable ||
      dueDateISO !== baselineDatesRef.current.due
    );
  }

  function addTagFromInput() {
    const t = tagInput.trim();
    if (!t) return;
    if ((tags || []).includes(t)) {
      setTagInput("");
      return;
    }
    setTags([...(tags || []), t]);
    setTagInput("");
  }

  async function doSubmit(applyDates: boolean) {
    setSaveError(null);

    try {
      const pending = pendingValidatedRef.current;

      const itemBase = buildItem(applyDates);
      const nextItem: SubscriptionItem = {
        ...itemBase,
        name: pending?.finalName ?? itemBase.name,
        amount: pending?.amountInt ?? Math.trunc(itemBase.amount),
        paymentMethod: paymentMethod.trim(),
        tags: uniqTags(tags),
        notes: notes.trim() || undefined,
      };

      await onSubmit(nextItem);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSaveError(`儲存失敗：${msg}`);
    }
  }

  function handleSaveClick() {
    setSaveError(null);

    const trimmedName = name.trim();
    const finalName = trimmedName ? trimmedName : "(未命名)";

    const trimmedAmount = amount.trim();
    const amountNum = trimmedAmount === "" ? 0 : Number(trimmedAmount);

    if (
      !Number.isFinite(amountNum) ||
      amountNum < 0 ||
      (trimmedAmount !== "" && !Number.isInteger(amountNum))
    ) {
      setSaveError("金額格式不正確，請輸入 0 或正整數。");
      return;
    }

    const amountInt = Math.trunc(amountNum);
    pendingValidatedRef.current = { finalName, amountInt };
    if (finalName !== name) setName(finalName);

    if (!initialItem) {
      void doSubmit(true);
      return;
    }

    if (datesChanged()) {
      setDateConfirmOpen(true);
      return;
    }

    void doSubmit(true);
  }

  function requestCloseFromBackdropOrEsc() {
    if (!isDirty()) {
      onClose();
      return;
    }
    setDirtyConfirmOpen(true);
  }

  useModalBackHandler(open, requestCloseFromBackdropOrEsc, "item-dialog");

  const isEdit = !!initialItem;
  const shouldAutoSelectName = !isMobile && name.trim() === "(未命名)";

  return (
    <>
      <Dialog
        open={open}
        onClose={(_, reason) => {
          if (reason === "backdropClick" || reason === "escapeKeyDown") {
            requestCloseFromBackdropOrEsc();
          } else {
            onClose();
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>花費項目</DialogTitle>

        <DialogContent>
          {saveError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError}
            </Alert>
          ) : null}

          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="項目名稱"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              autoFocus={shouldAutoSelectName}
              inputRef={nameInputRef}
              onFocus={(e) => {
                if (name.trim() === "(未命名)") {
                  requestAnimationFrame(() => e.target.select());
                }
              }}
            />

            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                label="金額"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                fullWidth
                placeholder="例如：700"
                slotProps={{
                  htmlInput: { min: 0, inputMode: "numeric" },
                }}
              />

              <TextField
                select
                label="週期"
                value={cycle}
                onChange={(e) =>
                  setCycle(e.target.value as "monthly" | "yearly")
                }
                sx={{ width: 140, flexShrink: 0 }}
              >
                <MenuItem value="monthly">每月</MenuItem>
                <MenuItem value="yearly">每年</MenuItem>
              </TextField>
            </Stack>

            <DateFieldPopover
              label="可繳日"
              valueISO={payableFromISO}
              onChangeISO={setPayableFromISO}
              showWeekdayInDayPicker={showWeekdayInDayPicker}
            />

            <DateFieldPopover
              label="截止日"
              valueISO={dueDateISO}
              onChangeISO={setDueDateISO}
              showWeekdayInDayPicker={showWeekdayInDayPicker}
            />

            <Divider />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems="flex-start"
            >
              <Box sx={{ width: { xs: "100%", sm: 320 }, flexShrink: 0 }}>
                <TextField
                  label="付款方式"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  fullWidth
                  helperText="例如：主動繳款、信用卡自動扣繳"
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={needsAttention}
                      onChange={(e) => setNeedsAttention(e.target.checked)}
                    />
                  }
                  label="即將到期警示"
                  sx={{ m: 0 }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    mt: 0.5,
                    pl: 7.3,
                    display: "block",
                    lineHeight: 1.4,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                  }}
                >
                  接近截止日時以顏色警示。
                </Typography>
              </Box>
            </Stack>

            <Box>
              <TextField
                label={isMobile ? "標籤（以右側 + 新增）" : "標籤（以 Enter 或右側 + 新增）"}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTagFromInput();
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTagFromInput();
                  }
                }}
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <IconButton
                        size="small"
                        onClick={addTagFromInput}
                        edge="end"
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    ),
                  },
                }}
                helperText="例如：必要、娛樂、保險"
              />

              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 1, flexWrap: "wrap" }}
              >
                {tags.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    onDelete={() =>
                      setTags((prev) => prev.filter((x) => x !== t))
                    }
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
            </Box>

            <TextField
              label="備註"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              minRows={1}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          {isEdit && (
            <Button color="error" onClick={() => setTrashConfirmOpen(true)}>
              移除
            </Button>
          )}

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={onClose}>取消</Button>
            <Button variant="contained" onClick={handleSaveClick}>
              儲存
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Dirty Confirm */}
      <Dialog
        open={dirtyConfirmOpen}
        onClose={() => setDirtyConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>尚未儲存</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            你有尚未儲存的變更。要儲存後退出，還是捨棄變更？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            onClick={() => {
              setDirtyConfirmOpen(false);
              onClose();
            }}
          >
            捨棄變更
          </Button>
          <Button
            onClick={() => {
              setDirtyConfirmOpen(false);
              handleSaveClick();
            }}
          >
            儲存並退出
          </Button>
          <Button
            variant="contained"
            onClick={() => setDirtyConfirmOpen(false)}
          >
            繼續編輯
          </Button>
        </DialogActions>
      </Dialog>

      {/* 日期覆蓋確認 */}
      <Dialog
        open={dateConfirmOpen}
        onClose={() => setDateConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>日期已變更</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            本次修改包含了「可繳日」或「截止日」。確定要編輯日期嗎？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            若「放棄日期修改」仍會儲存其他欄位變更，只有日期維持不變。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDateConfirmOpen(false);
              void doSubmit(false);
            }}
          >
            放棄日期修改
          </Button>

          <Button
            variant="contained"
            onClick={() => {
              setDateConfirmOpen(false);
              void doSubmit(true);
            }}
            autoFocus
          >
            儲存日期修改
          </Button>
        </DialogActions>
      </Dialog>

      {/* 移除確認（取代 confirm） */}
      <Dialog
        open={trashConfirmOpen}
        onClose={() => setTrashConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>確定移除？</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            移除後此項目會進入回收桶，30 天後永久刪除。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrashConfirmOpen(false)}>取消</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setTrashConfirmOpen(false);
              if (!initialItem) return;
              onMoveToTrash(initialItem.id);
              onClose();
            }}
            autoFocus
          >
            移除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
