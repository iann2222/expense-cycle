import { useState } from "react";
import type { TagColors } from "../components/TagsView";

const TAG_COLORS_KEY = "expenseCycle.tagColors";

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

export function useTagColors() {
  const [tagColors, setTagColors] = useState<TagColors>(() => loadTagColors());

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

  return { tagColors, setTagColor, replaceAll, setTagColors };
}
