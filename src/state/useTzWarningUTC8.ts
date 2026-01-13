import { useEffect, useState } from "react";
import { todayISO_UTC8 } from "../utils/dates";

const TZ_WARNING_KEY = "expenseCycle.dismissTzWarning.v1";

export function useTzWarningUTC8() {
  const [open, setOpen] = useState(false);
  const [tzInfo, setTzInfo] = useState({ timeZone: "", offsetMin: 0 });

  useEffect(() => {
    const dismissedDate = localStorage.getItem(TZ_WARNING_KEY);
    const today = todayISO_UTC8();
    if (dismissedDate === today) return;

    const offsetMin = new Date().getTimezoneOffset(); // UTC+8 => -480
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    setTzInfo({ timeZone, offsetMin });

    if (offsetMin !== -480) setOpen(true);
  }, []);

  function close() {
    setOpen(false);
  }

  function dismissToday() {
    localStorage.setItem(TZ_WARNING_KEY, todayISO_UTC8());
    setOpen(false);
  }

  return { open, tzInfo, close, dismissToday };
}
