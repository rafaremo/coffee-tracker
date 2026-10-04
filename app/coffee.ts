import { z } from "zod";
import type { Store } from "./db.ts";

const text = z.string().trim().max(4000).nullable().optional();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .nullable()
  .optional();
export const tastingSchema = z
  .object({
    date: z.iso.date(),
    method: z.string().trim().min(1, "Enter a preparation method").max(200),
    rating: z.number().min(0).max(10),
    notes: z.string().trim().max(4000).optional(),
  })
  .strict();
export type Tasting = z.infer<typeof tastingSchema>;

export const coffeeSchema = z
  .object({
    name: z.string().trim().min(1, "Give your coffee a name").max(200),
    brand: text,
    country: text,
    region: text,
    farm: text,
    producer: text,
    variety: text,
    process: text,
    lot: text,
    roastLevel: text,
    harvestDate: text,
    roastDate: date,
    roasterNotes: text,
    tastingNotes: text,
    body: text,
    acidity: text,
    sweetness: text,
    aroma: text,
    aftertaste: text,
    brewingMethods: text,
    purchaseDate: date,
    purchasePlace: text,
    tags: text,
    personalNotes: text,
    tastings: z.array(tastingSchema).optional(),
    photoPath: z
      .string()
      .regex(/^\/uploads\/[a-f0-9-]+\.(jpg|png|webp|gif)$/)
      .nullable()
      .optional(),
    altitudeMasl: z.number().int().min(0).max(10000).nullable().optional(),
    myRating: z.number().min(0).max(10).nullable().optional(),
    scaScore: z.number().min(0).max(100).nullable().optional(),
    pricePerKg: z.number().min(0).max(1_000_000).nullable().optional(),
    weightG: z.number().int().min(0).max(1_000_000).nullable().optional(),
    isFavorite: z.boolean().default(false),
  })
  .strict();
export const coffeePatchSchema = coffeeSchema
  .partial()
  .extend({ isFavorite: z.boolean().optional() });
export type CoffeeData = z.infer<typeof coffeeSchema>;
export type Coffee = CoffeeData & {
  id: number;
  createdAt: string;
  updatedAt: string;
};
const fromRow = (row: Record<string, unknown>): Coffee => ({
  ...JSON.parse(String(row.data)),
  id: Number(row.id),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});
export const listSchema = z.object({
  search: z.string().max(200).optional(),
  favoriteOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  skip: z.number().int().min(0).default(0),
});

export class Coffees {
  constructor(private store: Store) {}
  list(input: z.input<typeof listSchema> = {}) {
    const { search, favoriteOnly, limit, skip } = listSchema.parse(input);
    const all = this.store.db
      .prepare("SELECT * FROM coffees ORDER BY id DESC")
      .all()
      .map(fromRow);
    const filtered = all.filter(
      (c) =>
        (!favoriteOnly || c.isFavorite) &&
        (!search ||
          [
            c.name,
            c.brand,
            c.country,
            c.region,
            c.variety,
            c.tastingNotes,
            c.tags,
          ].some((v) => v?.toLowerCase().includes(search.toLowerCase()))),
    );
    return {
      coffees: filtered.slice(skip, skip + limit),
      total: filtered.length,
    };
  }
  get(id: number) {
    z.number().int().positive().parse(id);
    const row = this.store.db
      .prepare("SELECT * FROM coffees WHERE id=?")
      .get(id);
    return row ? fromRow(row) : undefined;
  }
  add(input: unknown) {
    const data = coffeeSchema.parse(input);
    const now = new Date().toISOString();
    const result = this.store.db
      .prepare(
        "INSERT INTO coffees (data,created_at,updated_at) VALUES (?,?,?)",
      )
      .run(JSON.stringify(data), now, now);
    return this.get(Number(result.lastInsertRowid))!;
  }
  update(id: number, input: unknown) {
    const patch = coffeePatchSchema.parse(input);
    const current = this.get(id);
    if (!current) throw new Error("Coffee not found");
    const { id: _, createdAt, updatedAt, ...data } = current;
    this.store.db
      .prepare("UPDATE coffees SET data=?,updated_at=? WHERE id=?")
      .run(
        JSON.stringify(coffeeSchema.parse({ ...data, ...patch })),
        new Date().toISOString(),
        id,
      );
    return this.get(id)!;
  }
  delete(id: number) {
    if (!this.get(id)) throw new Error("Coffee not found");
    this.store.db.prepare("DELETE FROM coffees WHERE id=?").run(id);
  }
  addTasting(id: number, input: unknown) {
    const tasting = tastingSchema.parse(input);
    const coffee = this.get(id);
    if (!coffee) throw new Error("Coffee not found");
    return this.update(id, { tastings: [...(coffee.tastings ?? []), tasting] });
  }
  deleteTasting(id: number, index: number) {
    z.number().int().nonnegative().parse(index);
    const coffee = this.get(id);
    if (!coffee) throw new Error("Coffee not found");
    if (!coffee.tastings?.[index]) throw new Error("Tasting not found");
    return this.update(id, {
      tastings: coffee.tastings.filter((_, i) => i !== index),
    });
  }
  stats() {
    const all = this.store.db
      .prepare("SELECT * FROM coffees")
      .all()
      .map(fromRow);
    const rated = all.filter((c) => c.myRating != null);
    return {
      totalEntries: all.length,
      totalFavorites: all.filter((c) => c.isFavorite).length,
      avgRating: rated.length
        ? Math.round(
            (rated.reduce((n, c) => n + c.myRating!, 0) / rated.length) * 10,
          ) / 10
        : null,
      countries: new Set(all.map((c) => c.country).filter(Boolean)).size,
    };
  }
}

export function coffeeForm(form: FormData) {
  const input: Record<string, unknown> = {};
  const numbers = new Set([
    "myRating",
    "scaScore",
    "altitudeMasl",
    "pricePerKg",
    "weightG",
  ]);
  for (const field of Object.keys(coffeeSchema.shape)) {
    if (field === "isFavorite") input[field] = form.get(field) === "on";
    else if (form.has(field)) {
      const value = String(form.get(field)).trim();
      input[field] =
        value === ""
          ? field === "name"
            ? ""
            : null
          : numbers.has(field)
            ? Number(value)
            : value;
    }
  }
  return coffeeSchema.parse(input);
}

export function tastingForm(form: FormData) {
  const rating = String(form.get("rating") ?? "").trim();
  return tastingSchema.parse({
    date: form.get("date"),
    method: form.get("method"),
    rating: rating === "" ? undefined : Number(rating),
    notes: form.has("notes") ? form.get("notes") : undefined,
  });
}
