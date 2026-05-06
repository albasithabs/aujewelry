/**
 * Format a number to Indonesian Rupiah string.
 * Example: 1234567 -> "Rp 1.234.567"
 */
export function formatRupiah(num: number): string {
  const formatted = Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp ${formatted}`;
}

/**
 * Parse a Rupiah-formatted string back to a number.
 * Example: "Rp 1.234.567" -> 1234567
 */
export function parseRupiah(str: string): number {
  const cleaned = str.replace(/[^0-9-]/g, "");
  return Number(cleaned) || 0;
}

/**
 * Merge class names, filtering out falsy values.
 */
export function cn(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Generate a simple unique ID.
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
