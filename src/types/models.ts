export type BillingCycle = "monthly" | "yearly";

export type SubscriptionItem = {
  id: string;
  name: string;
  amount: number;
  currency: "TWD";
  cycle: BillingCycle;

  payableFromISO: string;
  dueDateISO: string;

  paymentMethod: string;
  tags: string[];

  // 回收桶機制
  deletedAtISO?: string; // 進回收桶時間
  purgeAfterISO?: string; // 預計永久刪除時間（= deletedAt + 30天）
};
