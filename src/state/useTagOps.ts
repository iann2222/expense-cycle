import type { SubscriptionItem } from "../types/models";
import type { TagColors } from "../components/TagsView";

export function useTagOps(args: {
  items: SubscriptionItem[];
  update: (item: SubscriptionItem) => Promise<void>;
  tagColors: TagColors;
  replaceTagColors: (next: TagColors) => void;

  tagOrder: string[];
  setTagOrder: (next: string[]) => void;
}) {
  const { items, update, tagColors, replaceTagColors, tagOrder, setTagOrder } =
    args;

  async function renameTag(oldTag: string, newTag: string) {
    const nextTag = newTag.trim();
    if (!nextTag) return;

    // 1) 更新 items 上的 tags
    const affected = items.filter((it) => (it.tags || []).includes(oldTag));
    for (const it of affected) {
      const nextTags = (it.tags || []).map((t) => (t === oldTag ? nextTag : t));
      const dedup = Array.from(new Set(nextTags));
      await update({ ...it, tags: dedup });
    }

    // 2) 更新 tagColors（並持久化）
    const nextMap: TagColors = { ...tagColors };
    if (nextMap[oldTag] && !nextMap[nextTag]) nextMap[nextTag] = nextMap[oldTag];
    delete nextMap[oldTag];
    replaceTagColors(nextMap);

    // 3) 更新 tagOrder（並持久化）
    if (tagOrder.length > 0) {
      const replaced = tagOrder.map((t) => (t === oldTag ? nextTag : t));
      setTagOrder(Array.from(new Set(replaced)));
    }
  }

  async function removeTag(tag: string) {
    // 1) 更新 items 上的 tags
    const affected = items.filter((it) => (it.tags || []).includes(tag));
    for (const it of affected) {
      const nextTags = (it.tags || []).filter((t) => t !== tag);
      await update({ ...it, tags: nextTags });
    }

    // 2) 更新 tagColors（並持久化）
    const nextMap: TagColors = { ...tagColors };
    delete nextMap[tag];
    replaceTagColors(nextMap);

    // 3) 更新 tagOrder（並持久化）
    if (tagOrder.length > 0) {
      setTagOrder(tagOrder.filter((t) => t !== tag));
    }
  }

  return { renameTag, removeTag };
}
