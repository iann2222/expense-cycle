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

async function clearStore(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
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

export function useItems() {
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 初次載入：讀 DB + 清理過期（>30天）回收桶資料
  useEffect(() => {
    (async () => {
      const today = todayISO_UTC8();
      const all = await getAllItems();

      const expired = all.filter((it) => it.purgeAfterISO && it.purgeAfterISO < today);
      if (expired.length > 0) {
        await Promise.all(expired.map((it) => deleteItem(it.id)));
      }

      const kept = all.filter((it) => !(it.purgeAfterISO && it.purgeAfterISO < today));
      setItems(kept);
      setLoading(false);
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
    if (payload.version !== 1) throw new Error("不支援的備份格式");
    if (!Array.isArray(payload.items)) throw new Error("備份內容格式錯誤（items）");

    // 覆蓋策略：清空 store → 全部寫入 → 更新 state
    await clearStore();
    await Promise.all(payload.items.map((it) => putItem(it)));
    setItems(payload.items);
  }

  return {
    loading,
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
