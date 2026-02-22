import type { DefaultViewMode } from "../state/useSettings";
import type { SubscriptionItem } from "../types/models";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  formatNTD,
  formatOriginalLabel,
  toMonthlyAmount,
  toYearlyAmount,
} from "../utils/money";

export function TrashView({
  items,
  viewMode,
  onRestore,
  onRemoveForever,
}: {
  items: SubscriptionItem[];
  viewMode: DefaultViewMode;
  onRestore: (id: string) => void;
  onRemoveForever: (id: string) => void;
}) {
  const [pendingRemove, setPendingRemove] = useState<SubscriptionItem | null>(
    null,
  );
  const [viewingItem, setViewingItem] = useState<SubscriptionItem | null>(null);
  const [viewingOpen, setViewingOpen] = useState(false);

  return (
    <Stack spacing={2}>
      {items.map((item) => {
        let amountLabel: string;
        if (viewMode === "original") amountLabel = formatOriginalLabel(item);
        else if (viewMode === "monthly")
          amountLabel = formatNTD(Math.round(toMonthlyAmount(item)));
        else amountLabel = formatNTD(Math.round(toYearlyAmount(item)));

        return (
          <Card
            key={item.id}
            variant="outlined"
            onClick={() => {
              setViewingItem(item);
              setViewingOpen(true);
            }}
            sx={{ cursor: "pointer" }}
          >
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
              >
                <Typography variant="h6">{item.name}</Typography>
                <Typography variant="h6">{amountLabel}</Typography>
              </Stack>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                刪除日：{item.deletedAtISO || "—"} ｜ 將於{" "}
                {item.purgeAfterISO || "—"} 永久刪除
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore(item.id);
                  }}
                >
                  還原
                </Button>
                <Button
                  color="error"
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingRemove(item);
                  }}
                >
                  永久刪除
                </Button>
              </Stack>
            </CardContent>
          </Card>
        );
      })}

      <Dialog
        open={!!pendingRemove}
        onClose={() => setPendingRemove(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>確定永久刪除？</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            永久刪除後將「無法復原」，請小心確認！
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingRemove(null)}>取消</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (!pendingRemove) return;
              onRemoveForever(pendingRemove.id);
              setPendingRemove(null);
            }}
            autoFocus
          >
            永久刪除
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={viewingOpen}
        onClose={() => setViewingOpen(false)}
        TransitionProps={{
          onExited: () => setViewingItem(null),
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>項目明細（回收桶）</DialogTitle>
        <DialogContent>
          {viewingItem ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="項目名稱"
                value={viewingItem.name}
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />

              <Stack direction="row" spacing={1}>
                <TextField
                  label="金額"
                  value={formatNTD(viewingItem.amount)}
                  fullWidth
                  slotProps={{ input: { readOnly: true } }}
                />
                <TextField
                  label="週期"
                  value={viewingItem.cycle === "monthly" ? "每月" : "每年"}
                  sx={{ width: 140, flexShrink: 0 }}
                  slotProps={{ input: { readOnly: true } }}
                />
              </Stack>

              <TextField
                label="可繳日"
                value={viewingItem.payableFromISO}
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="截止日"
                value={viewingItem.dueDateISO}
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="付款方式"
                value={viewingItem.paymentMethod || "—"}
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />

              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  標籤
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  {viewingItem.tags?.length ? (
                    viewingItem.tags.map((t) => <Chip key={t} label={t} />)
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  )}
                </Stack>
              </Stack>

              <TextField
                label="備註"
                value={viewingItem.notes || ""}
                fullWidth
                multiline
                minRows={1}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="刪除日"
                value={viewingItem.deletedAtISO || "—"}
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="永久刪除日"
                value={viewingItem.purgeAfterISO || "—"}
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
