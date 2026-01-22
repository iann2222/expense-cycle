import * as React from "react";
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import type { SubscriptionItem } from "../types/models";
import { pickReadableTextColor } from "../utils/colors";

export function ItemCard({
  item,
  amountLabel,
  onClick,
  tagColors,
  payableISO,
  dueISO,
  statusText,
  alert,
  markPaidVisible,
  onMarkPaid,
}: {
  item: SubscriptionItem;
  amountLabel: string;
  onClick: () => void;
  tagColors: Record<string, string>;
  payableISO: string;
  dueISO: string;
  statusText?: string;
  alert?: boolean;
  markPaidVisible?: boolean;
  onMarkPaid?: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <>
      <Card variant="outlined" onClick={onClick} sx={{ cursor: "pointer" }}>
        <CardContent sx={{ pt: 1.75, pb: 1.75, "&:last-child": { pb: 1.75 } }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "stretch" }}>
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                alignSelf: "stretch",
              }}
            >
              <Typography variant="h6" noWrap>
                {item.name}
              </Typography>

              <Box sx={{ flexGrow: 1 }} />

              <Box sx={{ mt: 0.5, minWidth: 0 }}>
                <Box sx={{ display: { xs: "block", sm: "none" } }}>
                  <Typography variant="body2" color="text.secondary">
                    {`可繳日：${payableISO}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {`截止日：${dueISO}`}
                  </Typography>
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: { xs: "none", sm: "block" },
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {`可繳日：${payableISO} ｜ 截止日：${dueISO}`}
                </Typography>
              </Box>

              {(item.tags?.length ?? 0) > 0 ? (
                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  sx={{
                    mt: 0.75,
                    minWidth: 0,
                    flexWrap: "nowrap",
                    overflow: "hidden",
                  }}
                >
                  {(item.tags || []).slice(0, 3).map((t) => {
                    const c = tagColors[t];
                    const readable = c ? pickReadableTextColor(c) : undefined;

                    return (
                      <Chip
                        key={t}
                        size="small"
                        label={t}
                        variant={c ? "filled" : "outlined"}
                        sx={(theme) => ({
                          ...(c
                            ? {
                                bgcolor: c,
                                color: readable,
                                border: "none",
                                boxShadow: "none",
                              }
                            : theme.palette.mode === "dark"
                            ? {
                                bgcolor: "transparent", // 透明底
                                border: `1px solid ${alpha(
                                  theme.palette.common.white,
                                  0.32
                                )}`, // 框線
                                color: theme.palette.common.white, // 白字
                              }
                            : {}),
                        })}
                      />
                    );
                  })}

                  {(item.tags || []).length > 3 ? (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`+${(item.tags || []).length - 3}`}
                    />
                  ) : null}
                </Stack>
              ) : null}
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                flexShrink: 0,
                minWidth: { xs: 120, sm: 140 },
                maxWidth: { xs: 140, sm: 160 },
                alignSelf: "stretch",
                minHeight: 72,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  whiteSpace: "nowrap", // 不換行
                  overflow: "visible", // 不要自己截斷
                  textOverflow: "clip",
                }}
              >
                {amountLabel}
              </Typography>

              <Box sx={{ flexGrow: 1 }} />

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 1,
                  minWidth: 0,
                }}
              >
                {statusText ? (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    sx={{
                      minWidth: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: alert ? "error.main" : "text.secondary",
                    }}
                  >
                    {alert ? (
                      <WarningAmberRounded
                        sx={{ fontSize: 18, flexShrink: 0 }}
                      />
                    ) : (
                      <AccessTimeRounded sx={{ fontSize: 18, flexShrink: 0 }} />
                    )}
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        lineHeight: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {statusText}
                    </Typography>
                  </Stack>
                ) : null}

                {markPaidVisible ? (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmOpen(true);
                    }}
                    sx={{
                      minWidth: 0,
                      px: 1.25,
                      py: 0.25,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    已繳費？
                  </Button>
                ) : null}
              </Box>
            </Box>
          </Box>
          
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>確認繳費</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            確認已繳本次費用？確認後會取消紅色警示（低打擾提示仍可保留）。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={() => {
              onMarkPaid?.();
              setConfirmOpen(false);
            }}
          >
            確認
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
