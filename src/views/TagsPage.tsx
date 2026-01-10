import type { SubscriptionItem } from "../types/models";
import { TagsView, type TagColors } from "../components/TagsView";

export function TagsPage({
  items,
  tagColors,
  onSetTagColor,
  onRenameTag,
  onRemoveTag,
}: {
  items: SubscriptionItem[];
  tagColors: TagColors;
  onSetTagColor: (tag: string, color: string) => void;
  onRenameTag: (oldTag: string, newTag: string) => Promise<void>;
  onRemoveTag: (tag: string) => Promise<void>;
}) {
  return (
    <TagsView
      items={items}
      tagColors={tagColors}
      onSetTagColor={onSetTagColor}
      onRenameTag={onRenameTag}
      onRemoveTag={onRemoveTag}
    />
  );
}
