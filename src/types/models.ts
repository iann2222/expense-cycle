export type BillingCycle = "monthly" | "yearly";

export type SubscriptionItem = {
  id: string;
  name: string;
  amount: number;
  currency: "TWD";
  cycle: BillingCycle;

  payableFromISO: string;
  dueDateISO: string;
  needsAttention?: boolean;
  paidForDueISO?: string; // 若等於當期 nextDue，代表「這一輪」已繳費，紅色警示要消失

  paymentMethod: string;
  tags: string[];

  notes?: string;

  // 回收桶機制
  deletedAtISO?: string;
  purgeAfterISO?: string;
};
