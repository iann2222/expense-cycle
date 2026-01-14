import * as React from "react";
import type { TagColors } from "../components/TagsView";

const TAG_COLORS_KEY = "expenseCycle.tagColors";
const TAG_ORDER_KEY = "expenseCycle.tagOrder";

function loadTagColors(): TagColors {
  try {
    const raw = localStorage.getItem(TAG_COLORS_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw) as TagColors;
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function saveTagColors(map: TagColors) {
  localStorage.setItem(TAG_COLORS_KEY, JSON.stringify(map));
}

function loadTagOrder(): string[] {
  try {
    const raw = localStorage.getItem(TAG_ORDER_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => typeof x === "string");
  } catch {
    return [];
  }
}

function saveTagOrder(order: string[]) {
  localStorage.setItem(TAG_ORDER_KEY, JSON.stringify(order));
}

function normalizeOrder(input: string[]): string[] {
  return Array.from(new Set(input.map((t) => t.trim()).filter(Boolean)));
}

export function useTagColors() {
  const [tagColors, setTagColors] = React.useState<TagColors>(() =>
    loadTagColors()
  );
  const [tagOrderState, setTagOrderState] = React.useState<string[]>(() =>
    loadTagOrder()
  );

  function setTagColor(tag: string, color: string) {
    setTagColors((prev) => {
      const next = { ...prev };
      if (!color) delete next[tag];
      else next[tag] = color;
      saveTagColors(next);
      return next;
    });
  }

  function replaceAll(next: TagColors) {
    setTagColors(next);
    saveTagColors(next);
  }

  // ✅ 同時支援 setTagOrder(nextArray) 與 setTagOrder(prev => nextArray)
  type TagOrderUpdater = string[] | ((prev: string[]) => string[]);

  function setTagOrder(updater: TagOrderUpdater) {
    setTagOrderState((prev) => {
      const nextRaw = typeof updater === "function" ? updater(prev) : updater;
      const next = normalizeOrder(nextRaw);
      saveTagOrder(next);
      return next;
    });
  }

  function renameTagInOrder(oldTag: string, newTag: string) {
    const next = newTag.trim();
    if (!next) return;

    setTagOrder((prev) => prev.map((t) => (t === oldTag ? next : t)));
  }

  function removeTagFromOrder(tag: string) {
    setTagOrder((prev) => prev.filter((t) => t !== tag));
  }

  return {
    tagColors,
    setTagColor,
    replaceAll,
    setTagColors,

    // ✅ 對外提供穩定名稱
    tagOrder: tagOrderState,
    setTagOrder,
    renameTagInOrder,
    removeTagFromOrder,
  };
}
