import type { DefaultViewMode } from "../state/useSettings";
import type { SubscriptionItem } from "../types/models";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
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

  return (
    <Stack spacing={2}>
      {items.map((item) => {
        let amountLabel: string;
        if (viewMode === "original") amountLabel = formatOriginalLabel(item);
        else if (viewMode === "monthly")
          amountLabel = formatNTD(Math.round(toMonthlyAmount(item)));
        else amountLabel = formatNTD(Math.round(toYearlyAmount(item)));

        return (
          <Card key={item.id} variant="outlined">
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
                <Button variant="outlined" onClick={() => onRestore(item.id)}>
                  還原
                </Button>
                <Button
                  color="error"
                  variant="outlined"
                  onClick={() => setPendingRemove(item)}
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
    </Stack>
  );
}
