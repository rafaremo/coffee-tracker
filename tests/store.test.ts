import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../app/db.ts";
import { Coffees, coffeeForm, coffeeSchema } from "../app/coffee.ts";

test("coffee validation, search, patch semantics, persistence and migrations", () => {
  const dir = mkdtempSync(join(tmpdir(), "coffee-store-"));
  let store = new Store(join(dir, "coffee.db"));
  try {
    const coffees = new Coffees(store);
    assert.throws(() => coffees.add({ name: " " }));
    assert.throws(() => coffees.add({ name: "Test", myRating: 11 }));
    assert.throws(() => coffees.add({ name: "Test", weightG: 1.5 }));
    assert.throws(() =>
      coffees.add({ name: "Test", photoPath: "javascript:alert(1)" }),
    );
    assert.throws(() => coffees.add({ name: "Test", unexpected: "field" }));
    const coffee = coffees.add({
      name: "Ethiopia",
      country: "Ethiopia",
      myRating: 0,
      isFavorite: true,
    });
    assert.equal(coffees.stats().avgRating, 0);
    assert.equal(coffees.list({ search: "ETHIOPIA" }).total, 1);
    assert.equal(
      coffees.update(coffee.id, { brand: "A roaster" }).isFavorite,
      true,
    );
    assert.equal(coffees.update(coffee.id, { country: null }).country, null);
    assert.equal(coffees.list({ favoriteOnly: true }).total, 1);
    const form = new FormData();
    form.set("name", "Colombia");
    form.set("myRating", "bad");
    assert.throws(() => coffeeForm(form));
    store.close();
    store = new Store(join(dir, "coffee.db"));
    assert.equal(new Coffees(store).list().total, 1);
    assert.equal(
      store.db.prepare("SELECT COUNT(*) AS n FROM migrations").get()!.n,
      2,
    );
    new Coffees(store).delete(coffee.id);
    assert.equal(new Coffees(store).get(coffee.id), undefined);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("startup backfills legacy ratings once and preserves existing tastings", () => {
  const dir = mkdtempSync(join(tmpdir(), "coffee-backfill-"));
  const filename = join(dir, "coffee.db");
  const legacy = new DatabaseSync(filename);
  let store: Store | undefined;
  try {
    const initial = readFileSync(
      new URL("../db/migrations/001_initial.sql", import.meta.url),
      "utf8",
    );
    legacy.exec(initial);
    legacy.exec(
      "CREATE TABLE migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)",
    );
    legacy.prepare("INSERT INTO migrations VALUES (?, ?)").run(
      "001_initial.sql",
      createHash("sha256").update(initial).digest("hex"),
    );
    const createdAt = "2025-03-14T23:45:00.000Z";
    const updatedAt = "2026-01-02T12:00:00.000Z";
    const fixtures = [
      { name: "Rated", myRating: 8.5, brewingMethods: "V60", personalNotes: "Bag notes" },
      { name: "Zero", myRating: 0 },
      { name: "Empty method", myRating: 7, brewingMethods: "" },
      { name: "Null method", myRating: 7, brewingMethods: null },
      { name: "Long method", myRating: 10, brewingMethods: "a".repeat(201) },
      { name: "Existing", myRating: 9, tastings: [
        { date: "2026-01-01", method: "Espresso", rating: 6, notes: "Keep me" },
      ] },
      { name: "Empty tastings", myRating: 8, tastings: [] },
      { name: "Null rating", myRating: null },
      { name: "Unrated" },
    ].map((fixture) => coffeeSchema.parse(fixture));
    for (const fixture of fixtures) {
      legacy.prepare(
        "INSERT INTO coffees (data, created_at, updated_at) VALUES (?, ?, ?)",
      ).run(JSON.stringify(fixture), createdAt, updatedAt);
    }
    legacy.close();

    store = new Store(filename);
    const rows = store.db.prepare("SELECT * FROM coffees ORDER BY id").all();
    const methods = ["V60", "Registro inicial", "Registro inicial", "Registro inicial", "a".repeat(200)];
    rows.forEach((row, index) => {
      const original = fixtures[index]!;
      assert.equal(row.created_at, createdAt);
      assert.equal(row.updated_at, updatedAt);
      if (index < methods.length) {
        const data = JSON.parse(String(row.data));
        assert.deepEqual(data, {
          ...original,
          tastings: [{ date: "2025-03-14", method: methods[index], rating: original.myRating }],
        });
        coffeeSchema.parse(data);
      } else {
        assert.equal(row.data, JSON.stringify(original));
      }
    });
    assert.equal(
      store.db.prepare("SELECT COUNT(*) AS n FROM migrations").get()!.n,
      2,
    );
    store.close();
    store = new Store(filename);
    assert.deepEqual(store.db.prepare("SELECT * FROM coffees ORDER BY id").all(), rows);
  } finally {
    if (legacy.isOpen) legacy.close();
    store?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("tastings validate strictly, persist, and leave coffee-level notes and ratings intact", () => {
  const dir = mkdtempSync(join(tmpdir(), "coffee-tastings-"));
  let store = new Store(join(dir, "coffee.db"));
  try {
    const coffees = new Coffees(store);
    const coffee = coffees.add({
      name: "Daily coffee",
      myRating: 7,
      personalNotes: "My bag notes",
    });
    assert.equal(coffee.tastings, undefined);
    const tasting = { date: "2026-10-04", method: "v60", rating: 0 };
    for (const patch of [
      { date: "2026-02-30" },
      { date: "04-10-2026" },
      { method: " " },
      { rating: -1 },
      { rating: 10.1 },
      { rating: "8" },
      { notes: null },
      { unexpected: true },
    ]) {
      assert.throws(() =>
        coffees.addTasting(coffee.id, { ...tasting, ...patch }),
      );
      assert.throws(() =>
        coffees.update(coffee.id, { tastings: [{ ...tasting, ...patch }] }),
      );
    }
    coffees.addTasting(coffee.id, tasting);
    coffees.addTasting(coffee.id, {
      ...tasting,
      rating: 10,
      notes: "With milk",
    });
    const form = new FormData();
    form.set("name", "Renamed coffee");
    form.set("myRating", "7");
    form.set("personalNotes", "My bag notes");
    const updated = coffees.update(coffee.id, coffeeForm(form));
    assert.equal(updated.tastings?.length, 2);
    assert.equal(updated.myRating, 7);
    assert.equal(updated.personalNotes, "My bag notes");
    assert.equal(coffees.stats().avgRating, 7);
    assert.throws(() => coffees.deleteTasting(coffee.id, -1));
    assert.throws(() => coffees.deleteTasting(coffee.id, 0.5));
    assert.throws(() => coffees.deleteTasting(coffee.id, 2));
    coffees.deleteTasting(coffee.id, 0);
    store.close();
    store = new Store(join(dir, "coffee.db"));
    const persisted = new Coffees(store).get(coffee.id)!;
    assert.deepEqual(persisted.tastings, [
      { ...tasting, rating: 10, notes: "With milk" },
    ]);
    assert.equal(persisted.myRating, 7);
    assert.equal(persisted.personalNotes, "My bag notes");
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
