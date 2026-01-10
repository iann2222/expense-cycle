import type { DefaultViewMode } from "../state/useSettings";
import type { SubscriptionItem } from "../types/models";

import { Button, Card, CardContent, Stack, Typography } from "@mui/material";
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
                  onClick={() => {
                    if (confirm("確定永久刪除？此動作無法復原")) {
                      onRemoveForever(item.id);
                    }
                  }}
                >
                  永久刪除
                </Button>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
