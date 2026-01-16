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
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(new Date())
    .replace(/\s/g, ""); // 有些環境會是「下午 1:27」，這裡把空白移掉
}

/** 差幾天（用 UTC 中午，避免時區/DST 造成落在前/後一天） */
export function diffDays(fromISO: string, toISO: string) {
  const [fy, fm, fd] = fromISO.split("-").map(Number);
  const [ty, tm, td] = toISO.split("-").map(Number);

  const a = Date.UTC(fy, fm - 1, fd, 12, 0, 0);
  const b = Date.UTC(ty, tm - 1, td, 12, 0, 0);

  return Math.round((b - a) / 86400000);
}

/** 加減天數（以 UTC+8 的「日期」為基準回傳 YYYY-MM-DD） */
export function addDaysISO_UTC8(iso: string, days: number) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return todayISO_UTC8();
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);

  // 用 UTC 中午當錨點避免落在時區邊界，之後再用 Asia/Taipei 格式化成日期。
  const base = Date.UTC(y, mo - 1, d, 12, 0, 0);
  const next = base + days * 86400000;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(next));
}
