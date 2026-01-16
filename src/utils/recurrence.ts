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
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

function addCycleClamped(
  iso: string,
  cycle: SubscriptionItem["cycle"],
  n: number
): ISODate {
  if (n === 0) return iso as ISODate;
  // Date#setMonth 支援負數月份，因此 addMonthsClamped/addYearsClamped 也自然支援 n < 0。
  return cycle === "monthly" ? addMonthsClamped(iso, n) : addYearsClamped(iso, n);
}

/**
 * 對某個 item 計算「本期/下一期的可繳日與截止日」
 * 規則：
 * 1) 本期是否輪替以「截止日」為準：只有 today > 截止日 才輪替到下一期
 * 2) payable 必須對齊到截止日所屬的那一期：取 <= due 的最近一次 payable
 */
export function computeNextDates(item: SubscriptionItem, fromISO: string) {
  // 防呆：格式不對就回 fromISO
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(item.payableFromISO) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(item.dueDateISO) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fromISO)
  ) {
    const f = fromISO as ISODate;
    return { nextPayable: f, nextDue: f };
  }

  const cycle = item.cycle;

  // 先用 due 當作「期別」的 anchor
  let due = item.dueDateISO as ISODate;

  // 把 due 推到「>= fromISO 的第一個 due」（找到目前/下一期的截止日）
  // 注意：若 fromISO <= due，代表我們仍在 due 所代表的這一期
  if (fromISO > due) {
    for (let i = 0; i < 2400; i++) {
      due = addCycleClamped(due, cycle, 1);
      if (fromISO <= due) break;
    }
  }

  // payable 對齊：找「<= due 的最近一次 payable」
  let payable = item.payableFromISO as ISODate;

  if (payable > due) {
    // payable 不應該在 due 之後；往回一個週期直到 <= due
    // 可能來自匯入/手動輸入不乾淨資料：這樣能把 payable 對齊回 due 所在期別
    for (let i = 0; i < 2400 && payable > due; i++) {
      payable = addCycleClamped(payable, cycle, -1);
    }
  }

  // 用「往後推」找到 <= due 的最大 payable
  // 也就是：一直推，直到下一次推就會超過 due
  for (let i = 0; i < 2400; i++) {
    const next = addCycleClamped(payable, cycle, 1);
    if (next <= due) payable = next;
    else break;
  }

  // 最後得到的 payable/due 就是「目前應該顯示的本期」
  return { nextPayable: payable, nextDue: due };
}
