import * as React from "react";
import type { SubscriptionItem } from "../types/models";
import { TagsView, type TagColors } from "../components/TagsView";

export function TagsPage({
  items,
  tagColors,
  tagOrder,
  onReorderTags,
  onSetTagColor,
  onRenameTag,
  onRemoveTag,
}: {
  items: SubscriptionItem[];
  tagColors: TagColors;

  tagOrder: string[];
  onReorderTags: (next: string[]) => void;

  onSetTagColor: (tag: string, color: string) => void;
  onRenameTag: (oldTag: string, newTag: string) => Promise<void>;
  onRemoveTag: (tag: string) => Promise<void>;
}) {
  // 依目前 items 建立 tag count，供初始化/補齊順序使用
  const { allTags, countMap } = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      for (const t of it.tags || []) map.set(t, (map.get(t) || 0) + 1);
    }
    const tags = Array.from(map.keys());
    return { allTags: tags, countMap: map };
  }, [items]);

  // 確保 tagOrder：
  // - 第一次沒有順序時，用「count 由多到少、再按字典」當初始值（延續你原本 TagsView 的排序體感）
  // - 後續若出現新 tag（不在 order 裡），append 到最後（並保持穩定）
  React.useEffect(() => {
    if (allTags.length === 0) return;

    const existing = tagOrder || [];

    // 過濾掉已不存在的 tag
    const filtered = existing.filter((t) => allTags.includes(t));

    // 補上新 tag
    const missing = allTags.filter((t) => !filtered.includes(t));

    let nextOrder: string[];

    if (filtered.length === 0) {
      // 第一次：沿用「依使用次數」的體感
      nextOrder = allTags
        .slice()
        .sort(
          (a, b) =>
            (countMap.get(b) || 0) - (countMap.get(a) || 0) ||
            a.localeCompare(b, "zh-Hant")
        );
    } else {
      // 後續：維持既有手動順序，新 tag append
      nextOrder = filtered.concat(
        missing.sort((a, b) => a.localeCompare(b, "zh-Hant"))
      );
    }

    const sameLength = nextOrder.length === existing.length;
    const sameContent =
      sameLength && nextOrder.every((t, i) => t === existing[i]);

    if (!sameContent) onReorderTags(nextOrder);
  }, [allTags, countMap, onReorderTags, tagOrder]);

  return (
    <TagsView
      items={items}
      tagColors={tagColors}
      tagOrder={tagOrder}
      onReorderTags={onReorderTags}
      onSetTagColor={onSetTagColor}
      onRenameTag={onRenameTag}
      onRemoveTag={onRemoveTag}
    />
  );
}
