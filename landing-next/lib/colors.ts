/**
 * Color utility functions for theme management
 */

/**
 * Darken or lighten a hex color by a percentage
 * @param hex - Hex color string (e.g., "#13ecda")
 * @param percent - Negative to darken, positive to lighten
 * @returns Modified hex color
 */
export function adjustColor(hex: string, percent: number): string {
  // Remove # if present and ensure valid hex
  const cleanHex = hex.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    return hex;
  }

  const num = parseInt(cleanHex, 16);
  const amt = Math.round(2.55 * percent);

  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));

  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

/**
 * Calculate contrasting text color (black or white) for a given background
 * @param hex - Background hex color
 * @returns Black or white hex color for optimal contrast
 */
export function getContrastColor(hex: string): string {
  const cleanHex = hex.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    return '#1a1a2e';
  }

  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#1a1a2e' : '#ffffff';
}

/**
 * Validate and normalize a hex color
 * @param hex - Hex color string
 * @param fallback - Fallback color if invalid
 * @returns Valid hex color
 */
export function normalizeHex(hex: string | undefined, fallback: string): string {
  if (!hex) return fallback;

  const cleanHex = hex.replace('#', '');
  if (/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    return `#${cleanHex.toLowerCase()}`;
  }
  if (/^[0-9A-Fa-f]{3}$/.test(cleanHex)) {
    // Expand 3-digit hex to 6-digit
    const expanded = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
    return `#${expanded.toLowerCase()}`;
  }

  return fallback;
}
