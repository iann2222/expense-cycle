import { useEffect, useState } from "react";
import type { SubscriptionItem } from "../types/models";
import { addDaysISO_UTC8, todayISO_UTC8 } from "../utils/dates";

export const DB_NAME = "expense-cycle-db";
export const STORE_NAME = "items";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllItems(): Promise<SubscriptionItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result as SubscriptionItem[]);
    req.onerror = () => reject(req.error);
  });
}

async function putItem(item: SubscriptionItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteItem(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function replaceAllItems(items: SubscriptionItem[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.clear();
    for (const item of items) store.put(item);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export type BackupPayload = {
  version: 1;
  exportedAtISO: string;
  origin: string;
  dbName: string;
  storeName: string;
  items: SubscriptionItem[];
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === "string";
}

function validateBackupItem(raw: unknown, index: number): SubscriptionItem {
  if (!raw || typeof raw !== "object") {
    throw new Error(`備份內容格式錯誤（items[${index}]）`);
  }

  const item = raw as Partial<SubscriptionItem>;
  const prefix = `備份內容格式錯誤（items[${index}]`;

  if (typeof item.id !== "string" || !item.id.trim()) {
    throw new Error(`${prefix}.id）`);
  }
  if (typeof item.name !== "string") {
    throw new Error(`${prefix}.name）`);
  }
  if (!Number.isFinite(item.amount)) {
    throw new Error(`${prefix}.amount）`);
  }
  if (item.currency !== "TWD") {
    throw new Error(`${prefix}.currency）`);
  }
  if (item.cycle !== "monthly" && item.cycle !== "yearly") {
    throw new Error(`${prefix}.cycle）`);
  }
  if (
    typeof item.payableFromISO !== "string" ||
    !ISO_DATE_RE.test(item.payableFromISO)
  ) {
    throw new Error(`${prefix}.payableFromISO）`);
  }
  if (typeof item.dueDateISO !== "string" || !ISO_DATE_RE.test(item.dueDateISO)) {
    throw new Error(`${prefix}.dueDateISO）`);
  }
  if (typeof item.paymentMethod !== "string") {
    throw new Error(`${prefix}.paymentMethod）`);
  }
  if (!Array.isArray(item.tags) || item.tags.some((t) => typeof t !== "string")) {
    throw new Error(`${prefix}.tags）`);
  }
  if (
    item.needsAttention !== undefined &&
    typeof item.needsAttention !== "boolean"
  ) {
    throw new Error(`${prefix}.needsAttention）`);
  }
  if (!isOptionalString(item.paidForDueISO)) {
    throw new Error(`${prefix}.paidForDueISO）`);
  }
  if (!isOptionalString(item.notes)) {
    throw new Error(`${prefix}.notes）`);
  }
  if (!isOptionalString(item.deletedAtISO)) {
    throw new Error(`${prefix}.deletedAtISO）`);
  }
  if (!isOptionalString(item.purgeAfterISO)) {
    throw new Error(`${prefix}.purgeAfterISO）`);
  }

  return {
    id: item.id as string,
    name: item.name as string,
    amount: item.amount as number,
    currency: item.currency as "TWD",
    cycle: item.cycle as SubscriptionItem["cycle"],
    payableFromISO: item.payableFromISO as string,
    dueDateISO: item.dueDateISO as string,
    needsAttention: item.needsAttention,
    paidForDueISO: item.paidForDueISO,
    paymentMethod: item.paymentMethod as string,
    tags: item.tags as string[],
    notes: item.notes,
    deletedAtISO: item.deletedAtISO,
    purgeAfterISO: item.purgeAfterISO,
  };
}

function validateBackupPayload(payload: BackupPayload): SubscriptionItem[] {
  if (!payload || typeof payload !== "object") {
    throw new Error("備份內容格式錯誤");
  }
  if (payload.version !== 1) throw new Error("不支援的備份格式");
  if (!Array.isArray(payload.items)) throw new Error("備份內容格式錯誤（items）");

  return payload.items.map(validateBackupItem);
}

export function useItems() {
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 初次載入：讀 DB + 清理過期（>30天）回收桶資料
  useEffect(() => {
    (async () => {
      try {
        setLoadError(null);

        const today = todayISO_UTC8();
        const all = await getAllItems();

        const expired = all.filter((it) => it.purgeAfterISO && it.purgeAfterISO < today);
        if (expired.length > 0) {
          await Promise.all(expired.map((it) => deleteItem(it.id)));
        }

        const kept = all.filter((it) => !(it.purgeAfterISO && it.purgeAfterISO < today));
        setItems(kept);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLoadError(`本機資料載入失敗：${msg}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function add(item: SubscriptionItem) {
    await putItem(item);
    setItems((prev) => [item, ...prev]);
  }

  async function update(item: SubscriptionItem) {
    await putItem(item);
    setItems((prev) => prev.map((x) => (x.id === item.id ? item : x)));
  }

  async function softDelete(id: string) {
    const target = items.find((x) => x.id === id);
    if (!target) return;

    const today = todayISO_UTC8();
    const deleted: SubscriptionItem = {
      ...target,
      deletedAtISO: today,
      purgeAfterISO: addDaysISO_UTC8(today, 30),
    };

    await putItem(deleted);
    setItems((prev) => prev.map((x) => (x.id === id ? deleted : x)));
  }

  async function restore(id: string) {
    const target = items.find((x) => x.id === id);
    if (!target) return;

    const restored: SubscriptionItem = { ...target };
    delete restored.deletedAtISO;
    delete restored.purgeAfterISO;

    await putItem(restored);
    setItems((prev) => prev.map((x) => (x.id === id ? restored : x)));
  }

  async function removeForever(id: string) {
    await deleteItem(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function exportBackup(): BackupPayload {
    return {
      version: 1,
      exportedAtISO: new Date().toISOString(),
      origin: window.location.origin,
      dbName: DB_NAME,
      storeName: STORE_NAME,
      items,
    };
  }

  async function importBackupReplace(payload: BackupPayload) {
    const nextItems = validateBackupPayload(payload);

    // 覆蓋策略：驗證完成後，用單一 transaction 清空並寫入，避免部分匯入。
    await replaceAllItems(nextItems);
    setItems(nextItems);
  }

  return {
    loading,
    loadError,
    items,
    activeItems: items.filter((x) => !x.deletedAtISO),
    trashItems: items.filter((x) => !!x.deletedAtISO),

    add,
    update,
    softDelete,
    restore,
    removeForever,

    exportBackup,
    importBackupReplace,
  };
}
