import { getDb } from "@/database/init";
import type { Category } from "@/types";

export function getAllCategories(): Category[] {
  const db = getDb();
  const rows = db.getAllSync<{ id: number; name: string; spending_limit: number | null; color: string }>(
    "SELECT id, name, spending_limit, color FROM categories ORDER BY name"
  );
  return rows.map((r) => ({ id: r.id, name: r.name, limit: r.spending_limit, color: r.color }));
}

function normalizeColorForCompare(hex: string): string {
  const m = hex.match(/^#?([0-9A-Fa-f]{6})/);
  return m ? `#${m[1].toLowerCase()}` : "";
}

export function getCategoriesByColor(color: string): Category[] {
  const normalized = normalizeColorForCompare(color);
  if (!normalized) return [];
  const db = getDb();
  const rows = db.getAllSync<{ id: number; name: string; spending_limit: number | null; color: string }>(
    "SELECT id, name, spending_limit, color FROM categories WHERE LOWER(color) = ?",
    normalized
  );
  return rows.map((r) => ({ id: r.id, name: r.name, limit: r.spending_limit, color: r.color }));
}

export function getCategoryById(id: number): Category | null {
  const db = getDb();
  const row = db.getFirstSync<{ id: number; name: string; spending_limit: number | null; color: string }>(
    "SELECT id, name, spending_limit, color FROM categories WHERE id = ?",
    id
  );
  return row ? { id: row.id, name: row.name, limit: row.spending_limit, color: row.color } : null;
}

export function createCategory(
  name: string,
  limit: number | null,
  color: string
): number {
  const db = getDb();
  const result = db.runSync("INSERT INTO categories (name, spending_limit, color) VALUES (?, ?, ?)", name, limit, color);
  return result.lastInsertRowId;
}

export function updateCategory(
  id: number,
  name: string,
  limit: number | null,
  color: string
): void {
  const db = getDb();
  db.runSync(
    "UPDATE categories SET name = ?, spending_limit = ?, color = ? WHERE id = ?",
    name,
    limit,
    color,
    id
  );
}

export function deleteCategory(id: number): void {
  const db = getDb();
  db.runSync("UPDATE transactions SET category_id = NULL WHERE category_id = ?", id);
  db.runSync("DELETE FROM categories WHERE id = ?", id);
}
