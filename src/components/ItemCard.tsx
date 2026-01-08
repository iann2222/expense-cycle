import { Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { SubscriptionItem } from "../types/models";
import type { TagColors } from "./TagsView";

export function ItemCard({
  item,
  amountLabel,
  onClick,
  tagColors,
  nextPayableISO,
  nextDueISO,
}: {
  item: SubscriptionItem;
  amountLabel: string;
  onClick: () => void;
  tagColors: TagColors;
  nextPayableISO: string;
  nextDueISO: string;
}) {
  return (
    <Card variant="outlined">
      <CardActionArea onClick={onClick}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline">
            <Typography variant="h6" sx={{ mr: 2 }}>
              {item.name}
            </Typography>
            <Typography variant="h6">{amountLabel}</Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            可繳日（下一次）：{nextPayableISO} ｜ 截止日（下一次）：{nextDueISO} ｜ 方式：{item.paymentMethod || "—"}
          </Typography>

          {item.tags?.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
              {item.tags.map((t) => {
                const c = tagColors[t];
                return (
                  <Chip
                    key={t}
                    label={t}
                    size="small"
                    variant={c ? "filled" : "outlined"}
                    sx={{
                      bgcolor: c || undefined,
                      color: c ? "#fff" : undefined,
                      mb: 0.5,
                    }}
                  />
                );
              })}
            </Stack>
          )}

          {item.notes?.trim() && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              備註：{item.notes}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
