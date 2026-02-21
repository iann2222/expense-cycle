import type { DefaultViewMode, SettingsV1 } from "../state/useSettings";
import type { SubscriptionItem } from "../types/models";
import type { TagColors } from "../components/TagsView";
import type { NextDates } from "../utils/sort";

import { Card, CardContent, Fab, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import { ItemCard } from "../components/ItemCard";
import { diffDays } from "../utils/dates";
import {
  formatNTD,
  formatOriginalLabel,
  toMonthlyAmount,
  toYearlyAmount,
} from "../utils/money";

export function ItemsView({
  loading,
  items,
  nowISO,
  nextDateMap,
  tagColors,
  settings,
  viewMode,
  totalMonthlyRaw,
  totalYearlyRaw,
  totalMonthlyEq,
  totalYearlyEq,
  onClickItem,
  onAdd,
  onMarkPaid, // ✅ A) 新增
}: {
  loading: boolean;
  items: SubscriptionItem[];
  nowISO: string;
  nextDateMap: Map<string, NextDates>;
  tagColors: TagColors;
  settings: SettingsV1;
  viewMode: DefaultViewMode;

  totalMonthlyRaw: number;
  totalYearlyRaw: number;
  totalMonthlyEq: number;
  totalYearlyEq: number;

  onClickItem: (item: SubscriptionItem) => void;
  onAdd: () => void;

  // ✅ A) 先讓 ItemsView 接收一個 callback
  onMarkPaid: (id: string, dueISO: string) => void;
}) {
  function viewModeLabel(vm: DefaultViewMode) {
    if (vm === "original") return "依原週期";
    if (vm === "monthly") return "月";
    return "年";
  }

  return (
    <>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            總計（{viewModeLabel(viewMode)}）
          </Typography>

          {viewMode === "original" ? (
            <Typography variant="h6" sx={{ mt: 0.5 }}>
              {formatNTD(totalMonthlyRaw)} / 月 ＋ {formatNTD(totalYearlyRaw)} /
              年
            </Typography>
          ) : viewMode === "monthly" ? (
            <Typography variant="h5">
              {formatNTD(totalMonthlyEq)}
            </Typography>
          ) : (
            <Typography variant="h5">
              {formatNTD(totalYearlyEq)}
            </Typography>
          )}
        </CardContent>
      </Card>

      {loading && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          載入中…
        </Typography>
      )}

      <Stack spacing={2}>
        {items.map((item) => {
          const next = nextDateMap.get(item.id);
          const payableISO = next?.nextPayable ?? item.payableFromISO;
          const dueISO = next?.nextDue ?? item.dueDateISO;

          const daysLeft = diffDays(nowISO, dueISO);

          const showStatus =
            settings.statusWindowDays >= 0 &&
            daysLeft >= 0 &&
            daysLeft <= settings.statusWindowDays;

          const statusText = showStatus
            ? daysLeft === 0
              ? "今天到期"
              : `剩 ${daysLeft} 天`
            : undefined;

          // ✅ B) rawAlert → paidForThisDue → alert
          const rawAlert =
            (item.needsAttention ?? true) &&
            settings.alertDays >= 0 &&
            daysLeft >= 0 &&
            daysLeft <= settings.alertDays;

          const paidForThisDue = item.paidForDueISO === dueISO;
          const alert = rawAlert && !paidForThisDue;

          let amountLabel: string;
          if (viewMode === "original") amountLabel = formatOriginalLabel(item);
          else if (viewMode === "monthly")
            amountLabel = formatNTD(Math.round(toMonthlyAmount(item)));
          else amountLabel = formatNTD(Math.round(toYearlyAmount(item)));

          return (
            <ItemCard
              key={item.id}
              item={item}
              amountLabel={amountLabel}
              tagColors={tagColors}
              payableISO={payableISO}
              dueISO={dueISO}
              statusText={statusText}
              alert={alert}
              // ✅ C) 只在紅色警示中顯示「已繳費？」
              markPaidVisible={alert}
              onMarkPaid={() => onMarkPaid(item.id, dueISO)}
              onClick={() => onClickItem(item)}
            />
          );
        })}
      </Stack>

      <Fab
        color="primary"
        sx={{ position: "fixed", right: 20, bottom: 20 }}
        onClick={onAdd}
      >
        <AddIcon />
      </Fab>
    </>
  );
}
