import {
  openDatabaseSync,
  type SQLiteDatabase,
} from "expo-sqlite";
import { migrations } from "./schema";

let db: SQLiteDatabase | null = null;

export function initDatabase() {
  if (!db) {
    db = openDatabaseSync("myfinance.db");
    for (const sql of migrations) {
      try {
        db.execSync(sql);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column name")) throw e;
      }
    }
  }
  return db;
}

export function getDb(): SQLiteDatabase {
  if (!db) {
    initDatabase();
  }
  return db!;
}
