/**
 * Format a number or numeric string with thousands separators (comma).
 * Example: 9999 -> "9,999", 9999.00 -> "9,999.00"
 */
export function formatPrice(
  amount: number | string | { toString(): string } | undefined | null,
  includeDecimals = false,
): string {
  if (amount === undefined || amount === null || amount === "") {
    return "0";
  }

  const num =
    typeof amount === "number"
      ? amount
      : typeof amount === "string"
        ? parseFloat(amount)
        : parseFloat(amount.toString());

  if (isNaN(num)) {
    return "0";
  }

  if (includeDecimals) {
    return num.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // If number has decimals, format with them, otherwise omit or round
  if (num % 1 !== 0) {
    return num.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return num.toLocaleString("th-TH");
}
