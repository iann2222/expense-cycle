// utils/colors.ts

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.replace("#", "").trim();
  if (![3, 6].includes(raw.length)) return null;

  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;

  return { r, g, b };
}

// WCAG 相對亮度
export function relativeLuminance(rgb: { r: number; g: number; b: number }) {
  const srgb = [rgb.r, rgb.g, rgb.b]
    .map((v) => v / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));

  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

export function pickReadableTextColor(bg: string) {
  let c = bg.replace("#", "");

  if (c.length === 3) {
    c = c.split("").map((x) => x + x).join("");
  }

  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);

  // 
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // 根據亮度調整文字顏色，門檻值可依喜好調整
  return brightness > 160 ? "#000000" : "#ffffff";
}

// 輕微調整亮度：amount -1..+1（hover 用）
export function shiftRgb(hex: string, amount: number) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const a = clamp01(Math.abs(amount));
  const lighten = amount >= 0;

  const mix = (c: number) => {
    const target = lighten ? 255 : 0;
    return Math.round(c + (target - c) * a);
  };

  return `#${[mix(rgb.r), mix(rgb.g), mix(rgb.b)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}
