// src/views/AnalysisPage.tsx
import * as React from "react";
import type { SubscriptionItem } from "../types/models";
import { toMonthlyAmount, toYearlyAmount, formatNTD } from "../utils/money";

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

type AnalysisMode = "monthly" | "yearly";

export function AnalysisPage({ items }: { items: SubscriptionItem[] }) {
  // 分析頁自己的口徑（不影響首頁 viewMode）
  const [mode, setMode] = React.useState<AnalysisMode>("monthly");

  // 分析頁暫時排除的項目（只在本頁生效）
  const [excludedIds, setExcludedIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  const rows = React.useMemo(() => {
    const list = items
      .map((it) => {
        const amount =
          mode === "monthly"
            ? Math.round(toMonthlyAmount(it))
            : Math.round(toYearlyAmount(it));

        return {
          id: it.id,
          name: it.name,
          amount,
          excluded: excludedIds.has(it.id),
        };
      })
      .filter((r) => r.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return list;
  }, [items, mode, excludedIds]);

  // 清理不存在的 id，避免幽靈排除
  React.useEffect(() => {
    setExcludedIds((prev) => {
      if (prev.size === 0) return prev;
      const existing = new Set(rows.map((r) => r.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (existing.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [rows]);

  const includedRows = React.useMemo(
    () => rows.filter((r) => !r.excluded),
    [rows],
  );

  const total = React.useMemo(
    () => includedRows.reduce((acc, r) => acc + r.amount, 0),
    [includedRows],
  );

  const maxAmount = React.useMemo(
    () => (includedRows.length ? includedRows[0].amount : 0),
    [includedRows],
  );

  function toggleExclude(id: string) {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetExcluded() {
    setExcludedIds(new Set());
  }

  const excludedCount = excludedIds.size;

  return (
    <Stack spacing={2}>
      {/* 口徑切換（只影響分析頁） */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            分析口徑（只影響本頁）
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip
              label="月等價"
              clickable
              color={mode === "monthly" ? "primary" : "default"}
              variant={mode === "monthly" ? "filled" : "outlined"}
              onClick={() => setMode("monthly")}
            />
            <Chip
              label="年等價"
              clickable
              color={mode === "yearly" ? "primary" : "default"}
              variant={mode === "yearly" ? "filled" : "outlined"}
              onClick={() => setMode("yearly")}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* 總額 */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            總額（{mode === "monthly" ? "月等價" : "年等價"}）
          </Typography>

          <Typography variant="h4" sx={{ mt: 0.5 }}>
            {formatNTD(total)}
          </Typography>

          {excludedCount > 0 ? (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                已排除 {excludedCount} 個項目
              </Typography>
              <Button size="small" onClick={resetExcluded}>
                重設
              </Button>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              可在下方列表直接排除/加入某個項目，僅影響本頁統計。
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* 項目分佈 */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            項目分佈（由高到低）
          </Typography>

          <Stack spacing={1.25} sx={{ mt: 1.5 }}>
            {rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                尚無可分析的項目
              </Typography>
            ) : null}

            {rows.map((r) => {
              const included = !r.excluded;
              const ratioTotal = included && total > 0 ? r.amount / total : 0;

              // bar 長度以「目前納入統計的最大值」做相對比例（更直覺）
              const ratioMax =
                included && maxAmount > 0 ? r.amount / maxAmount : 0;

              return (
                <Box
                  key={r.id}
                  sx={{
                    opacity: included ? 1 : 0.45,
                    transition: "opacity 120ms ease",
                  }}
                >
                  {/* 標題列：名稱｜金額+占比｜按鈕 */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={r.name}
                    >
                      {r.name}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      {formatNTD(r.amount)}
                      {included ? `（${Math.round(ratioTotal * 100)}%）` : ""}
                    </Typography>

                    <Button
                      size="small"
                      variant={included ? "outlined" : "contained"}
                      color={included ? "inherit" : "primary"}
                      onClick={() => toggleExclude(r.id)}
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      {included ? "排除" : "加入"}
                    </Button>
                  </Box>

                  {/* bar */}
                  <Box
                    sx={{
                      mt: 0.5,
                      height: 8,
                      borderRadius: 999,
                      bgcolor: "action.hover",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        width: `${Math.round(ratioMax * 100)}%`,
                        bgcolor: included ? "primary.main" : "text.disabled",
                        transition: "width 160ms ease",
                      }}
                    />
                  </Box>

                  <Divider sx={{ mt: 1.25 }} />
                </Box>
              );
            })}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
