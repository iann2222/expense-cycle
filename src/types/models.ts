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

  paymentMethod: string;
  tags: string[];

  notes?: string;

  // 回收桶機制
  deletedAtISO?: string;
  purgeAfterISO?: string;
};
