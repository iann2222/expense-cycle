import { useEffect, useState } from "react";
import { todayISO_UTC8, timeHM_UTC8 } from "../utils/dates";

export function useNowUTC8() {
  const [nowISO, setNowISO] = useState(() => todayISO_UTC8());
  const [timeHM, setTimeHM] = useState(() => timeHM_UTC8());

  useEffect(() => {
    function tick() {
      setNowISO(todayISO_UTC8());
      setTimeHM(timeHM_UTC8());
    }

    tick();
    window.addEventListener("focus", tick);

    function onVis() {
      if (document.visibilityState === "visible") tick();
    }
    document.addEventListener("visibilitychange", onVis);

    const id = window.setInterval(tick, 60_000);
    return () => {
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(id);
    };
  }, []);

  return { nowISO, timeHM };
}
