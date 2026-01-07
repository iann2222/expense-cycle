import { useMemo, useState } from "react";
import {
  AppBar,
  Box,
  Container,
  CssBaseline,
  Fab,
  Toolbar,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

type BillingCycle = "monthly" | "yearly";

type SubscriptionItem = {
  id: string;
  name: string;
  amount: number;
  currency: "TWD";
  cycle: BillingCycle;

  // B: 可繳日 + 截止日
  payableFromISO: string; // 可繳日
  dueDateISO: string; // 截止日

  paymentMethod: string;
  tags: string[];
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function toMonthlyAmount(item: SubscriptionItem) {
  return item.cycle === "monthly" ? item.amount : item.amount / 12;
}

function toYearlyAmount(item: SubscriptionItem) {
  return item.cycle === "yearly" ? item.amount : item.amount * 12;
}

function todayISO() {
  // yyyy-mm-dd
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function makeId() {
  return crypto.randomUUID();
}

export default function App() {
  // 先用範例資料：下一步會改成 IndexedDB
  const [items, setItems] = useState<SubscriptionItem[]>([
    {
      id: "rent",
      name: "房租",
      amount: 22000,
      currency: "TWD",
      cycle: "monthly",
      payableFromISO: "2026-01-10",
      dueDateISO: "2026-01-10",
      paymentMethod: "轉帳（手動）",
      tags: ["居住", "必要"],
    },
    {
      id: "netflix",
      name: "Netflix",
      amount: 390,
      currency: "TWD",
      cycle: "monthly",
      payableFromISO: "2026-01-18",
      dueDateISO: "2026-01-18",
      paymentMethod: "信用卡自動扣款",
      tags: ["影音", "娛樂"],
    },
    {
      id: "insurance",
      name: "保險（年繳）",
      amount: 24000,
      currency: "TWD",
      cycle: "yearly",
      payableFromISO: "2026-06-30",
      dueDateISO: "2026-06-30",
      paymentMethod: "信用卡自動扣款",
      tags: ["保險", "必要"],
    },
  ]);

  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");

  // Dialog 狀態
  const [open, setOpen] = useState(false);

  // 表單狀態（先做簡單版）
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [payableFromISO, setPayableFromISO] = useState<string>(todayISO());
  const [dueDateISO, setDueDateISO] = useState<string>(todayISO());
  const [paymentMethod, setPaymentMethod] = useState<string>("信用卡自動扣款");
  const [tagInput, setTagInput] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);

  const total = useMemo(() => {
    const sum = items.reduce((acc, it) => {
      return acc + (viewMode === "monthly" ? toMonthlyAmount(it) : toYearlyAmount(it));
    }, 0);
    return Math.round(sum);
  }, [items, viewMode]);

  function resetForm() {
    setName("");
    setAmount("");
    setCycle("monthly");
    // B：預設可繳日與截止日相同
    const t = todayISO();
    setPayableFromISO(t);
    setDueDateISO(t);
    setPaymentMethod("信用卡自動扣款");
    setTagInput("");
    setTags([]);
  }

  function handleOpen() {
    resetForm();
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  function addTagFromInput() {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  function handleSubmit() {
    const trimmed = name.trim();
    const parsedAmount = Number(amount);

    // 先做最小驗證
    if (!trimmed) {
      alert("請輸入名稱");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert("請輸入正確金額（大於 0）");
      return;
    }
    if (!payableFromISO || !dueDateISO) {
      alert("請選擇可繳日與截止日");
      return;
    }
    if (payableFromISO > dueDateISO) {
      alert("可繳日不能晚於截止日");
      return;
    }

    const newItem: SubscriptionItem = {
      id: makeId(),
      name: trimmed,
      amount: parsedAmount,
      currency: "TWD",
      cycle,
      payableFromISO,
      dueDateISO,
      paymentMethod: paymentMethod.trim() || "（未填）",
      tags,
    };

    setItems((prev) => [newItem, ...prev]);
    setOpen(false);
  }

  return (
    <>
      <CssBaseline />
      <AppBar position="sticky" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ExpenseCycle
          </Typography>

          <Stack direction="row" spacing={1}>
            <Chip
              label="月統計"
              clickable
              color={viewMode === "monthly" ? "primary" : "default"}
              onClick={() => setViewMode("monthly")}
              variant={viewMode === "monthly" ? "filled" : "outlined"}
            />
            <Chip
              label="年統計"
              clickable
              color={viewMode === "yearly" ? "primary" : "default"}
              onClick={() => setViewMode("yearly")}
              variant={viewMode === "yearly" ? "filled" : "outlined"}
            />
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ py: 3 }}>
        <Container maxWidth="sm">
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                總計（{viewMode === "monthly" ? "月" : "年"}）
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>
                {formatMoney(total, "TWD")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                目前先存在記憶體；下一步會改成本機資料庫（IndexedDB），重整也不會不見。
              </Typography>
            </CardContent>
          </Card>

          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            訂閱與固定支出
          </Typography>

          <Stack spacing={2}>
            {items
              .slice()
              .sort((a, b) => a.dueDateISO.localeCompare(b.dueDateISO))
              .map((item) => {
                const normalized =
                  viewMode === "monthly"
                    ? Math.round(toMonthlyAmount(item))
                    : Math.round(toYearlyAmount(item));

                return (
                  <Card key={item.id} variant="outlined">
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                        <Typography variant="h6">{item.name}</Typography>
                        <Typography variant="h6">
                          {formatMoney(normalized, item.currency)}
                        </Typography>
                      </Stack>

                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        週期：{item.cycle === "monthly" ? "每月" : "每年"} ｜ 可繳日：{item.payableFromISO} ｜ 截止日：{item.dueDateISO}
                      </Typography>

                      <Divider sx={{ my: 1.5 }} />

                      <Typography variant="body2" color="text.secondary">
                        付款方式：{item.paymentMethod}
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                        {item.tags.map((t) => (
                          <Chip
                            key={t}
                            label={t}
                            size="small"
                            variant="outlined"
                            sx={{ mb: 0.5 }}
                          />
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
          </Stack>

          <Fab
            color="primary"
            aria-label="add"
            sx={{ position: "fixed", right: 20, bottom: 20 }}
            onClick={handleOpen}
          >
            <AddIcon />
          </Fab>
        </Container>
      </Box>

      {/* 新增訂閱 Dialog */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>新增項目</DialogTitle>
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
              inputMode="numeric"
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

            {/* B：兩個日期，預設同一天 */}
            <TextField
              label="可繳日"
              type="date"
              value={payableFromISO}
              onChange={(e) => {
                const v = e.target.value;
                setPayableFromISO(v);
                // 你要求：預設兩日期顯示同個日期
                // 這裡做得更直覺：如果目前兩者相同，就跟著一起改
                if (dueDateISO === payableFromISO) setDueDateISO(v);
              }}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              label="截止日"
              type="date"
              value={dueDateISO}
              onChange={(e) => setDueDateISO(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              label="付款方式"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="例如：信用卡自動扣款 / 轉帳 / 超商繳費"
              fullWidth
            />

            {/* 標籤 */}
            <TextField
              label="新增標籤（Enter 加入）"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTagFromInput();
                }
              }}
              placeholder="例如：必要、娛樂、影音"
              fullWidth
            />

            {tags.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {tags.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    onDelete={() => removeTag(t)}
                    sx={{ mb: 0.5 }}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>取消</Button>
          <Button variant="contained" onClick={handleSubmit}>
            新增
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
