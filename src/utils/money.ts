import type { SubscriptionItem } from "../types/models";

export function formatNTD(n: number) {
  const v = Number.isFinite(n) ? Math.round(n) : 0;
  return `${v.toLocaleString("zh-TW")} NTD`;
}

export function toMonthlyAmount(item: SubscriptionItem) {
  return item.cycle === "monthly" ? item.amount : item.amount / 12;
}

export function toYearlyAmount(item: SubscriptionItem) {
  return item.cycle === "yearly" ? item.amount : item.amount * 12;
}

export function formatOriginalLabel(item: SubscriptionItem) {
  const unit = item.cycle === "monthly" ? "月" : "年";
  return `${formatNTD(item.amount)} / ${unit}`;
}
