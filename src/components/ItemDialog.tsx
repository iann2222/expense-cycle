import * as React from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { SubscriptionItem } from "../types/models";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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

// ✅ 星期顯示：不帶「週」，只顯示「一二三…日」
function weekdayZh(iso: string) {
  const { y, m, d } = parseISO(iso);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const names = ["日", "一", "二", "三", "四", "五", "六"] as const;
  return names[date.getDay()];
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
  const days = React.useMemo(() => Array.from({ length: maxD }, (_, i) => i + 1), [maxD]);

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
        InputProps={{ readOnly: true }}
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
}: {
  open: boolean;
  initialItem?: SubscriptionItem;
  onClose: () => void;
  onSubmit: (item: SubscriptionItem) => void;
  onMoveToTrash: (id: string) => void;
  showWeekdayInDayPicker: boolean;
}) {
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState<string>("");
  const [cycle, setCycle] = React.useState<"monthly" | "yearly">("monthly");
  const [payableFromISO, setPayableFromISO] = React.useState(todayISO());
  const [dueDateISO, setDueDateISO] = React.useState(todayISO());
  const [paymentMethod, setPaymentMethod] = React.useState("");

  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // dirty confirm（點外面/ESC）
  const initialSnapshotRef = React.useRef<string>("");
  const [dirtyConfirmOpen, setDirtyConfirmOpen] = React.useState(false);

  // ✅ 日期覆蓋確認（只在編輯且日期變更時）
  const [dateConfirmOpen, setDateConfirmOpen] = React.useState(false);
  const pendingSubmitRef = React.useRef<null | { applyDates: boolean }>(null);

  React.useEffect(() => {
    if (!open) return;

    if (initialItem) {
      setName(initialItem.name);
      setAmount(String(initialItem.amount));
      setCycle(initialItem.cycle);
      setPayableFromISO(initialItem.payableFromISO);
      setDueDateISO(initialItem.dueDateISO);
      setPaymentMethod(initialItem.paymentMethod || "");
      setTags(uniqTags(initialItem.tags || []));
      setTagInput("");
      setNotes(initialItem.notes || "");
    } else {
      setName("");
      setAmount("");
      setCycle("monthly");
      const t = todayISO();
      setPayableFromISO(t);
      setDueDateISO(t);
      setPaymentMethod("");
      setTags([]);
      setTagInput("");
      setNotes("");
    }

    initialSnapshotRef.current = JSON.stringify({
      name: initialItem?.name ?? "",
      amount: initialItem ? String(initialItem.amount) : "",
      cycle: initialItem?.cycle ?? "monthly",
      payableFromISO: initialItem?.payableFromISO ?? todayISO(),
      dueDateISO: initialItem?.dueDateISO ?? todayISO(),
      paymentMethod: initialItem?.paymentMethod ?? "",
      tags: uniqTags(initialItem?.tags ?? []),
      notes: initialItem?.notes ?? "",
    });

    setDirtyConfirmOpen(false);
    setDateConfirmOpen(false);
    pendingSubmitRef.current = null;
  }, [open, initialItem]);

  function currentSnapshot() {
    return JSON.stringify({
      name: name.trim(),
      amount: amount.trim(),
      cycle,
      payableFromISO,
      dueDateISO,
      paymentMethod: paymentMethod.trim(),
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
      id: initialItem?.id || crypto.randomUUID(),
      name: name.trim() || "(未命名)",
      amount: Number(amount) || 0,
      currency: "TWD",
      cycle,
      payableFromISO: applyDates ? payableFromISO : basePayable,
      dueDateISO: applyDates ? dueDateISO : baseDue,
      paymentMethod: paymentMethod.trim(),
      tags: uniqTags(tags),
      notes: notes.trim() || undefined,
      // 刪除欄位由外層保留處理（你 App.tsx 已做）
    };
  }

  function datesChanged() {
    if (!initialItem) return false;
    return (
      payableFromISO !== initialItem.payableFromISO ||
      dueDateISO !== initialItem.dueDateISO
    );
  }

  function doSubmit(applyDates: boolean) {
    onSubmit(buildItem(applyDates));
    onClose();
  }

  function handleSaveClick() {
    // 新增：不問
    if (!initialItem) {
      doSubmit(true);
      return;
    }
    // 編輯：日期有改才問
    if (datesChanged()) {
      pendingSubmitRef.current = { applyDates: true };
      setDateConfirmOpen(true);
      return;
    }
    doSubmit(true);
  }

  function requestCloseFromBackdropOrEsc() {
    if (!isDirty()) {
      onClose();
      return;
    }
    setDirtyConfirmOpen(true);
  }

  function addTagFromInput() {
    const v = tagInput.trim();
    if (!v) return;
    setTags((prev) => uniqTags([...prev, v]));
    setTagInput("");
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={(_e, reason) => {
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
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="名稱" value={name} onChange={(e) => setName(e.target.value)} fullWidth />

            <Stack direction="row" spacing={1}>
              <TextField
                label="金額"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                sx={{ flex: 1 }}
                placeholder="例如：3200"
                slotProps={{
                  htmlInput: { min: 0, inputMode: "numeric" },
                }}
              />

              <TextField
                select
                label="週期"
                value={cycle}
                onChange={(e) => setCycle(e.target.value as any)}
                sx={{ width: 140 }}
              >
                <MenuItem value="monthly">每月</MenuItem>
                <MenuItem value="yearly">每年</MenuItem>
              </TextField>
            </Stack>

            <DateFieldPopover
              label="可繳日（下一次）"
              valueISO={payableFromISO}
              onChangeISO={setPayableFromISO}
              showWeekdayInDayPicker={showWeekdayInDayPicker}
            />
            <DateFieldPopover
              label="截止日（下一次）"
              valueISO={dueDateISO}
              onChangeISO={setDueDateISO}
              showWeekdayInDayPicker={showWeekdayInDayPicker}
            />

            <TextField
              label="付款方式"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              fullWidth
              helperText="例如：主動繳款、信用卡自動扣繳"
            />

            <TextField
              label="標籤（按 Enter 新增）"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTagFromInput();
                }
              }}
              fullWidth
              helperText="例如：必要、娛樂、保險"
            />

            {tags.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {tags.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    onDelete={() => setTags((prev) => prev.filter((x) => x !== t))}
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
            )}

            <TextField
              label="備註"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              placeholder="例如：家庭共享，卡號末四碼 1234…"
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Box sx={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              {initialItem && (
                <Button
                  color="error"
                  onClick={() => {
                    if (confirm("確定移除？（會進入回收桶，可在 30 天內還原）")) {
                      onMoveToTrash(initialItem.id);
                      onClose();
                    }
                  }}
                >
                  移除
                </Button>
              )}
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
              <Button onClick={onClose}>取消</Button>
              <Button variant="contained" onClick={handleSaveClick}>
                儲存
              </Button>
            </Box>
          </Box>
        </DialogActions>
      </Dialog>

      {/* ✅ 日期覆蓋確認（只在編輯且日期變更時） */}
      <Dialog open={dateConfirmOpen} onClose={() => setDateConfirmOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>日期已變更</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            你這次修改了「可繳日（下一次）」或「截止日（下一次）」。
            要把這次日期變更覆蓋到此項目嗎？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            （若選「不覆蓋」，本次仍會儲存其他欄位變更，但日期會保留原值。）
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDateConfirmOpen(false);
              // 不覆蓋日期，只存其他欄位
              doSubmit(false);
            }}
          >
            不覆蓋
          </Button>

          <Button
            variant="contained"
            onClick={() => {
              setDateConfirmOpen(false);
              doSubmit(true);
            }}
            autoFocus
          >
            覆蓋日期
          </Button>
        </DialogActions>
      </Dialog>

      {/* dirty confirm：點外面/ESC */}
      <Dialog open={dirtyConfirmOpen} onClose={() => setDirtyConfirmOpen(false)} fullWidth maxWidth="xs">
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
            variant="outlined"
            onClick={() => {
              setDirtyConfirmOpen(false);
              onSubmit(buildItem(true));
              onClose();
            }}
          >
            儲存並退出
          </Button>

          <Button variant="contained" autoFocus onClick={() => setDirtyConfirmOpen(false)}>
            繼續編輯
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
