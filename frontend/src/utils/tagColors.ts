export const TAG_COLOR_PALETTE: string[] = [
  '#c81919', '#90c819', '#19c888', '#1924c8', '#c8199c', '#c87c19', '#2dc819', '#19a8c8',
  '#7019c8', '#c81939', '#b0c819', '#19c865', '#1944c8', '#c819bc', '#c85c19', '#50c819',
  '#19c8c8', '#5019c8', '#c81959', '#c8bc19', '#19c844', '#1965c8', '#b319c8', '#c83919',
  '#70c819', '#19c8a8', '#3019c8', '#c8197c', '#c89c19', '#19c824', '#1985c8', '#9019c8',
  '#9c1c1c', '#739c1c', '#1c9c6d', '#1c249c', '#9c1c7c', '#9c641c', '#2b9c1c', '#1c849c',
  '#5c1c9c', '#9c1c33', '#8b9c1c', '#1c9c53', '#1c3c9c', '#9c1c93', '#9c4d1c', '#449c1c',
  '#1c9c9c', '#441c9c', '#9c1c4b', '#9c931c', '#1c9c3c', '#1c539c', '#8d1c9c', '#9c331c',
  '#5c9c1c', '#1c9c84', '#2d1c9c', '#9c1c64', '#9c7c1c', '#1c9c24', '#1c6b9c', '#731c9c',
  '#e81717', '#a6e817', '#17e89b', '#1725e8', '#e817b4', '#e88d17', '#2fe817', '#17c2e8',
  '#8017e8', '#e8173d', '#cce817', '#17e872', '#174be8', '#e817da', '#e86717', '#59e817',
  '#17e8e8', '#5917e8', '#e81764', '#e8da17', '#17e84b', '#1772e8', '#d017e8', '#e83d17',
  '#80e817', '#17e8c2', '#3317e8', '#e8178d', '#e8b417', '#17e825', '#1798e8', '#a617e8',
  '#b11b1b', '#82b11b', '#1bb17a', '#1b25b1', '#b11b8c', '#b1701b', '#2cb11b', '#1b96b1',
  '#661bb1', '#b11b36', '#9db11b', '#1bb15c', '#1b40b1', '#b11ba7', '#b1541b', '#4ab11b',
  '#1bb1b1', '#4a1bb1', '#b11b52', '#b1a71b', '#1bb140', '#1b5cb1', '#a01bb1', '#b1361b',
  '#66b11b', '#1bb196', '#2f1bb1', '#b11b70', '#b18c1b', '#1bb125', '#1b78b1', '#821bb1'
];

/**
 * Computes a 32-bit integer hash code identical to Java String.hashCode()
 */
export function stringHashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * Returns the deterministic color from the 128 palette for a given tag category and value
 */
export function getDeterministicTagColor(category?: string, value?: string): string {
  const key = (category?.trim().toLowerCase() || '') + ':' + (value?.trim() || '');
  const hash = stringHashCode(key);
  const index = ((hash % TAG_COLOR_PALETTE.length) + TAG_COLOR_PALETTE.length) % TAG_COLOR_PALETTE.length;
  return TAG_COLOR_PALETTE[index];
}

/**
 * Returns up to `count` unused colors from the palette.
 * If most colors are in use, it wraps around to ensure `count` choices.
 */
export function getUnusedPaletteColors(
  usedColors: (string | null | undefined)[],
  count = 8
): string[] {
  const usedSet = new Set(
    usedColors
      .filter((c): c is string => Boolean(c))
      .map(c => c.toLowerCase().trim())
  );

  const unused = TAG_COLOR_PALETTE.filter(c => !usedSet.has(c.toLowerCase()));

  if (unused.length >= count) {
    return unused.slice(0, count);
  }

  // If fewer than `count` are free, append from full palette to guarantee `count` options
  const result = [...unused];
  for (const c of TAG_COLOR_PALETTE) {
    if (result.length >= count) break;
    if (!result.includes(c)) {
      result.push(c);
    }
  }
  return result;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) {
    return { r: 59, g: 130, b: 246 }; // fallback blue
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Calculates accessible styles (subtle background tint, matching border, dark readable text, and solid dot)
 */
export function getTagBadgeStyles(hexColor?: string | null) {
  const color = hexColor && hexColor.startsWith('#') ? hexColor : '#3b82f6';
  const rgb = hexToRgb(color);

  // Background tint: ~10% opacity
  const bg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`;
  // Border tint: ~28% opacity
  const border = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.28)`;
  // Text color: readable slate-800 for high contrast
  const text = '#1e293b';

  return {
    bg,
    border,
    text,
    dot: color
  };
}

