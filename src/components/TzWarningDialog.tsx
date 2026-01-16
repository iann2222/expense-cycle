import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { useModalBackHandler } from "../state/useModalBackHandler";

export function TzWarningDialog({
  open,
  tzInfo,
  onClose,
  onDismissToday,
}: {
  open: boolean;
  // ✅ 跟你 useTzWarningUTC8 的 tzInfo 對齊
  tzInfo: { timeZone: string; offsetMin: number } | null;
  onClose: () => void;
  onDismissToday: () => void;
}) {
  // Android 返回鍵：直接關閉
  useModalBackHandler(open, onClose, "tz-warning");

  if (!tzInfo) return null;

  const sign = tzInfo.offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(tzInfo.offsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>時區提醒</DialogTitle>

      <DialogContent>
        <Typography variant="body2">
          目前偵測到你的裝置時區為：{tzInfo.timeZone}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          offset：UTC{sign}
          {hh}:{mm}
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onDismissToday}>今天不再提示</Button>
        <Button variant="contained" onClick={onClose}>
          我知道了
        </Button>
      </DialogActions>
    </Dialog>
  );
}
