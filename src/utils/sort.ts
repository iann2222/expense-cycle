import type { SubscriptionItem } from "../types/models";
import type { SortKey, SortOrder } from "../state/useSettings";

export type NextDates = { nextPayable: string; nextDue: string };

export function compareItemsWithNext(
  a: SubscriptionItem,
  b: SubscriptionItem,
  key: SortKey,
  order: SortOrder,
  nextMap: Map<string, NextDates>
) {
  let result = 0;

  if (key === "dueDate") {
    const ad = nextMap.get(a.id)?.nextDue ?? a.dueDateISO;
    const bd = nextMap.get(b.id)?.nextDue ?? b.dueDateISO;
    result = ad.localeCompare(bd);
  } else if (key === "amount") {
    result = a.amount - b.amount;
  } else {
    result = a.name.localeCompare(b.name, "zh-Hant");
  }

  return order === "asc" ? result : -result;
}
