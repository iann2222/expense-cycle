import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { useModalBackHandler } from "../state/useModalBackHandler";

export function ImportResultDialog({
  open,
  success,
  message,
  onClose,
}: {
  open: boolean;
  success: boolean;
  message: string;
  onClose: () => void;
}) {
  // Android 返回鍵：直接關閉
  useModalBackHandler(open, onClose, "import-result");

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{success ? "匯入成功" : "匯入失敗"}</DialogTitle>

      <DialogContent>
        <Alert severity={success ? "success" : "error"} sx={{ mb: 1.5 }}>
          {message}
        </Alert>

        {!success && (
          <Typography variant="body2" color="text.secondary">
            請確認檔案是否為 ExpenseCycle 匯出的備份檔，或稍後再試一次。
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          確認
        </Button>
      </DialogActions>
    </Dialog>
  );
}
