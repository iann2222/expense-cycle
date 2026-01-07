import { Card, CardContent, Chip, Divider, Stack, Typography } from "@mui/material";
import type { SubscriptionItem } from "../types/models";

export function ItemCard({
  item,
  amountLabel,
  onClick,
}: {
  item: SubscriptionItem;
  amountLabel: string;
  onClick: () => void;
}) {
  return (
    <Card variant="outlined" sx={{ cursor: "pointer" }} onClick={onClick}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography variant="h6">{item.name}</Typography>
          <Typography variant="h6">{amountLabel}</Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {item.cycle === "monthly" ? "每月" : "每年"} ｜ 可繳 {item.payableFromISO} ｜ 截止{" "}
          {item.dueDateISO}
        </Typography>

        <Divider sx={{ my: 1.25 }} />

        <Typography variant="body2" color="text.secondary">
          付款方式：{item.paymentMethod || "（未填）"}
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
          {item.tags.map((t) => (
            <Chip key={t} label={t} size="small" />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
