import AsyncStorage from "@react-native-async-storage/async-storage";

const CUSTOM_COLORS_KEY = "@my_finance_custom_colors";

let cachedColors: string[] | null = null;

export async function loadCustomColors(): Promise<string[]> {
  if (cachedColors !== null) return cachedColors;
  try {
    const stored = await AsyncStorage.getItem(CUSTOM_COLORS_KEY);
    cachedColors = stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    cachedColors = [];
  }
  return cachedColors ?? [];
}

export function getCustomColorsSync(): string[] {
  return cachedColors ?? [];
}

export function setCustomColorsCache(colors: string[]): void {
  cachedColors = colors;
}

function normalizeHex(hex: string): string {
  const match = hex.match(/^#?([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?$/);
  return match ? `#${match[1].toLowerCase()}` : hex;
}

export async function addCustomColor(hex: string): Promise<string[]> {
  const colors = await loadCustomColors();
  const normalized = normalizeHex(hex);
  if (!/^#[0-9A-Fa-f]{6}$/.test(normalized)) return colors;
  if (colors.some((c) => normalizeHex(c) === normalized)) return colors;
  const next = [...colors, normalized];
  await AsyncStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(next));
  cachedColors = next;
  return next;
}

export async function removeCustomColor(index: number): Promise<string[]> {
  const colors = await loadCustomColors();
  if (index < 0 || index >= colors.length) return colors;
  const next = colors.filter((_, i) => i !== index);
  await AsyncStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(next));
  cachedColors = next;
  return next;
}

export async function updateCustomColor(index: number, hex: string): Promise<string[]> {
  const colors = await loadCustomColors();
  const normalized = normalizeHex(hex);
  if (!/^#[0-9A-Fa-f]{6}$/.test(normalized) || index < 0 || index >= colors.length) return colors;
  const next = [...colors];
  next[index] = normalized;
  await AsyncStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(next));
  cachedColors = next;
  return next;
}

export async function saveCustomColors(colors: string[]): Promise<void> {
  const valid = colors
    .filter((c) => /^#[0-9A-Fa-f]{6}$/.test(c))
    .map((c) => normalizeHex(c));
  await AsyncStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(valid));
  cachedColors = valid;
}
