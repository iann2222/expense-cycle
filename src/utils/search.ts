import type { SubscriptionItem } from "../types/models";

function normalizeText(s: string) {
  return s.trim().toLowerCase();
}

export function matchesSearch(item: SubscriptionItem, query: string) {
  if (!query) return true;
  const q = normalizeText(query);

  const nameHit = normalizeText(item.name).includes(q);
  const tagHit = (item.tags || []).some((t) => normalizeText(t).includes(q));
  const notesHit = normalizeText(item.notes || "").includes(q);

  return nameHit || tagHit || notesHit;
}

export function matchesTagsOR(item: SubscriptionItem, selectedTags: string[]) {
  if (selectedTags.length === 0) return true;
  const tags = item.tags || [];
  return selectedTags.some((t) => tags.includes(t));
}
