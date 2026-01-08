// src/utils/recurrence.ts
import type { SubscriptionItem } from "../types/models";

export type ISODate = `${number}-${string}-${string}`;

export function parseISO(iso: string): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return { y: 1970, m: 1, d: 1 };
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export function toISO(y: number, m: number, d: number): ISODate {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}` as ISODate;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate(); // m: 1-12
}

/**
 * 月底對齊：如果目標月沒有該日，改用該月最後一天
 */
export function addMonthsClamped(iso: string, months: number): ISODate {
  const { y, m, d } = parseISO(iso);
  const base = new Date(y, m - 1, 1);
  base.setMonth(base.getMonth() + months);

  const ny = base.getFullYear();
  const nm = base.getMonth() + 1;
  const nd = Math.min(d, daysInMonth(ny, nm));
  return toISO(ny, nm, nd);
}

export function addYearsClamped(iso: string, years: number): ISODate {
  return addMonthsClamped(iso, years * 12);
}

/**
 * 回傳今天的 ISO（以本機時區）
 */
export function todayISO(): ISODate {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * 從 anchor（通常是你存的「下一次」日期）往後推，
 * 找到第一個 >= fromISO 的日期。
 */
export function nextOccurrenceISO(
  anchorISO: string,
  cycle: SubscriptionItem["cycle"],
  fromISO: string
): ISODate {
  // 防呆：如果 anchor 格式怪，直接回傳 fromISO
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchorISO)) return fromISO as ISODate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromISO)) return anchorISO as ISODate;

  let cur = anchorISO as ISODate;

  // 如果 anchor 已經在 from 之後（或相等），直接用
  if (cur >= (fromISO as ISODate)) return cur;

  // 否則依 cycle 往後推到 >= from
  // 為避免極端資料造成無窮迴圈，加上合理上限
  for (let i = 0; i < 2400; i++) {
    cur =
      cycle === "monthly"
        ? addMonthsClamped(cur, 1)
        : addYearsClamped(cur, 1);

    if (cur >= (fromISO as ISODate)) return cur;
  }

  return cur;
}

/**
 * 對某個 item 計算「下一次可繳日 / 截止日」
 * - 目前用獨立推算（payable、due 各自推到 >= today）
 * - 若你未來想讓 due 永遠跟 payable 同期（例如 due = payable + N 天），可再改策略
 */
export function computeNextDates(item: SubscriptionItem, fromISO: string) {
  const nextPayable = nextOccurrenceISO(item.payableFromISO, item.cycle, fromISO);
  const nextDue = nextOccurrenceISO(item.dueDateISO, item.cycle, fromISO);
  return { nextPayable, nextDue };
}
