/**
 * Formats a string as Brazilian currency with 2 decimal places.
 * Input: only digits, user types "12345" -> "123,45"
 */
export function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  const amount = parseInt(digits, 10) / 100;
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parses a formatted currency string to number.
 */
export function parseCurrencyInput(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  return parseFloat(normalized) || 0;
}
