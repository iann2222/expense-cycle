import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

export function TzWarningDialog({
  open,
  tzInfo,
  onClose,
  onDismissToday,
}: {
  open: boolean;
  tzInfo: { timeZone: string; offsetMin: number };
  onClose: () => void;
  onDismissToday: () => void;
}) {
  const sign = tzInfo.offsetMin <= 0 ? "+" : "-";
  const hh = String(Math.abs(tzInfo.offsetMin / 60)).padStart(2, "0");

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>時區提醒</DialogTitle>
      <DialogContent>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ whiteSpace: "pre-line" }}
        >
          {`偵測到你的裝置時區可能不是 UTC+8（Asia/Taipei）。
ExpenseCycle 目前只支援以 UTC+8 計算日期與星期，裝置時區不同很可能導致日期時間有誤。`}
        </Typography>

        <Typography variant="body2" sx={{ mt: 1 }}>
          目前偵測：
          <br />
          timeZone：{tzInfo.timeZone || "（未知）"}
          <br />
          offset：UTC{sign}
          {hh}:00
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
