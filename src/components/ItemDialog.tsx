import { useEffect, useState } from "react";
import type { BillingCycle, SubscriptionItem } from "../types/models";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function ItemDialog({
  open,
  onClose,
  initialItem,
  onSubmit,
  onMoveToTrash,
}: {
  open: boolean;
  onClose: () => void;
  initialItem?: SubscriptionItem;
  onSubmit: (item: SubscriptionItem) => void;
  onMoveToTrash?: (id: string) => void;
}) {
  const isEdit = !!initialItem;

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [payableFromISO, setPayableFromISO] = useState(todayISO());
  const [dueDateISO, setDueDateISO] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;

    if (initialItem) {
      setName(initialItem.name);
      setAmount(String(initialItem.amount));
      setCycle(initialItem.cycle);
      setPayableFromISO(initialItem.payableFromISO);
      setDueDateISO(initialItem.dueDateISO);
      setPaymentMethod(initialItem.paymentMethod);
      setTags(initialItem.tags);
      setTagInput("");
    } else {
      const t = todayISO();
      setName("");
      setAmount("");
      setCycle("monthly");
      setPayableFromISO(t);
      setDueDateISO(t);
      setPaymentMethod("");
      setTags([]);
      setTagInput("");
    }
  }, [open, initialItem]);

  function addTag() {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) return;
    setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function submit() {
    const parsed = Number(amount);
    if (!name.trim()) return alert("請輸入名稱");
    if (!Number.isFinite(parsed) || parsed <= 0) return alert("請輸入正確金額（>0）");
    if (!payableFromISO || !dueDateISO) return alert("請選擇可繳日與截止日");
    if (payableFromISO > dueDateISO) return alert("可繳日不能晚於截止日");

    const item: SubscriptionItem = {
      id: initialItem?.id ?? crypto.randomUUID(),
      name: name.trim(),
      amount: parsed,
      currency: "TWD",
      cycle,
      payableFromISO,
      dueDateISO,
      paymentMethod: paymentMethod.trim(),
      tags,
      // 注意：不在 Dialog 這裡處理 deletedAt/purgeAfter
    };

    onSubmit(item);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEdit ? "編輯項目" : "新增項目"}

        {isEdit && onMoveToTrash && (
          <IconButton
            color="error"
            sx={{ position: "absolute", right: 8, top: 8 }}
            onClick={() => {
              if (confirm("確定將此項目移入回收桶？")) {
                onMoveToTrash(initialItem!.id);
                onClose();
              }
            }}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="名稱"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：房租、Netflix、保險"
            fullWidth
          />

          <TextField
            label="金額"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            slotProps={{
              htmlInput: {
                min: 0,
                step: 1,
              },
            }}
            fullWidth
          />

          <TextField
            label="週期"
            select
            value={cycle}
            onChange={(e) => setCycle(e.target.value as BillingCycle)}
            fullWidth
          >
            <MenuItem value="monthly">每月</MenuItem>
            <MenuItem value="yearly">每年</MenuItem>
          </TextField>

          <TextField
            label="可繳日"
            type="date"
            value={payableFromISO}
            slotProps={{ inputLabel: { shrink: true } }}
            onChange={(e) => {
              const v = e.target.value;
              // 若目前兩者相同，改可繳日時一起帶動截止日（符合你要的預設同日）
              if (dueDateISO === payableFromISO) setDueDateISO(v);
              setPayableFromISO(v);
            }}
            fullWidth
          />

          <TextField
            label="截止日"
            type="date"
            value={dueDateISO}
            slotProps={{ inputLabel: { shrink: true } }}
            onChange={(e) => setDueDateISO(e.target.value)}
            fullWidth
          />

          <TextField
            label="付款方式"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="例如：信用卡自動扣款 / 轉帳 / 超商繳費"
            fullWidth
          />

          <TextField
            label="新增標籤（Enter 加入）"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="例如：必要、娛樂、影音"
            fullWidth
          />

          {tags.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              {tags.map((t) => (
                <Chip key={t} label={t} onDelete={() => setTags(tags.filter((x) => x !== t))} />
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={submit}>
          {isEdit ? "儲存" : "新增"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
