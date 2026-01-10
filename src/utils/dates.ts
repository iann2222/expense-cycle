export const TZ = "Asia/Taipei";

export function todayISO_UTC8() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function timeHM_UTC8() {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/** 差幾天（用 UTC 中午，避免時區/DST 造成落在前/後一天） */
export function diffDays(fromISO: string, toISO: string) {
  const [fy, fm, fd] = fromISO.split("-").map(Number);
  const [ty, tm, td] = toISO.split("-").map(Number);

  const a = Date.UTC(fy, fm - 1, fd, 12, 0, 0);
  const b = Date.UTC(ty, tm - 1, td, 12, 0, 0);

  return Math.round((b - a) / 86400000);
}
