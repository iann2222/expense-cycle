import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import type { SubscriptionItem } from "../types/models";

export function ItemCard({
  item,
  amountLabel,
  onClick,
  tagColors,
  payableISO,
  dueISO,
  statusText,
  alert,
}: {
  item: SubscriptionItem;
  amountLabel: string;
  onClick: () => void;
  tagColors: Record<string, string>;
  payableISO: string;
  dueISO: string;
  statusText?: string;
  alert?: boolean;
}) {
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        cursor: "pointer",
      }}
    >
      <CardContent
        sx={{
          position: "relative",
          pt: 1.75,
          pb: 1.75,
          "&:last-child": {
            pb: 1.75,
          },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography variant="h6">{item.name}</Typography>
          <Typography variant="h6">{amountLabel}</Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          可繳日：{payableISO} ｜ 截止日：{dueISO}
        </Typography>

        {/* 標籤 + 狀態（右側固定不被推走） */}
        <Box
          sx={{
            mt: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 1,
          }}
        >
          {/* 左：標籤（可換行、可縮） */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
              {(item.tags || []).map((t) => (
                <Chip
                  key={t}
                  size="small"
                  label={t}
                  sx={{
                    mb: 0.5,
                    ...(tagColors[t]
                      ? {
                          bgcolor: tagColors[t],
                          color: "rgba(0,0,0,0.87)",
                        }
                      : {}),
                  }}
                />
              ))}
            </Stack>
          </Box>

          {/* 右：狀態（固定在右側、不換行、不縮） */}
          {statusText ? (
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{
                flexShrink: 0,
                whiteSpace: "nowrap",
                color: alert ? "error.main" : "text.secondary",
                mt: 0.25, // 讓它視覺更貼近第一排 chip 的中心線，可微調
              }}
            >
              {alert ? (
                <WarningAmberRounded sx={{ fontSize: 18 }} />
              ) : (
                <AccessTimeRounded sx={{ fontSize: 18 }} />
              )}

              <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1 }}>
                {statusText}
              </Typography>
            </Stack>
          ) : null}
        </Box>

        {item.notes ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, whiteSpace: "pre-wrap" }}
          >
            {item.notes}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
