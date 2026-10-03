import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../app/db.ts";
import { Coffees, coffeeForm } from "../app/coffee.ts";

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
      1,
    );
    new Coffees(store).delete(coffee.id);
    assert.equal(new Coffees(store).get(coffee.id), undefined);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
