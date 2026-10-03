import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

export class Store {
  readonly db: DatabaseSync;
  constructor(filename: string) {
    if (filename !== ":memory:")
      mkdirSync(dirname(resolve(filename)), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;",
    );
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)",
    );
    const directory = new URL("../db/migrations/", import.meta.url);
    for (const name of readdirSync(directory)
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      const sql = readFileSync(new URL(name, directory), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      this.db.exec("BEGIN IMMEDIATE");
      try {
        const applied = this.db
          .prepare("SELECT checksum FROM migrations WHERE name=?")
          .get(name);
        if (applied && applied.checksum !== checksum)
          throw new Error(`Migration changed: ${name}`);
        if (!applied) {
          this.db.exec(sql);
          this.db
            .prepare("INSERT INTO migrations VALUES (?, ?)")
            .run(name, checksum);
        }
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    this.cleanup();
  }
  cleanup() {
    this.db.prepare("DELETE FROM state WHERE expires_at <= ?").run(Date.now());
  }
  get<T>(namespace: string, key: string): T | undefined {
    const row = this.db
      .prepare(
        "SELECT value FROM state WHERE namespace=? AND key=? AND expires_at>?",
      )
      .get(namespace, key, Date.now());
    return row ? (JSON.parse(String(row.value)) as T) : undefined;
  }
  put(namespace: string, key: string, value: unknown, ttlSeconds: number) {
    this.db
      .prepare("INSERT OR REPLACE INTO state VALUES (?, ?, ?, ?)")
      .run(
        namespace,
        key,
        JSON.stringify(value),
        Date.now() + ttlSeconds * 1000,
      );
  }
  remove(namespace: string, key: string) {
    this.db
      .prepare("DELETE FROM state WHERE namespace=? AND key=?")
      .run(namespace, key);
  }
  clear(namespace: string) {
    this.db.prepare("DELETE FROM state WHERE namespace=?").run(namespace);
  }
  close() {
    this.db.close();
  }
}
