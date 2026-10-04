import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  Coffees,
  coffeeSchema,
  coffeePatchSchema,
  listSchema,
  tastingSchema,
} from "./coffee.ts";

export function createCoffeeMcp(coffees: Coffees) {
  const server = new McpServer({ name: "coffee-tracker", version: "2.0.0" });
  const result = (value: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
  });
  const read = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };
  const write = {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  };
  const security = {
    securitySchemes: [{ type: "oauth2", scopes: ["coffee"] }],
  };
  server.registerTool(
    "list_coffees",
    {
      title: "List coffees",
      description:
        "Search the owner’s coffee collection by name, roaster, origin, variety, notes, or tags.",
      inputSchema: listSchema,
      annotations: read,
      _meta: security,
    },
    (args) => result(coffees.list(args)),
  );
  server.registerTool(
    "get_coffee",
    {
      title: "Get coffee",
      description: "Read the full profile of one coffee.",
      inputSchema: { id: z.number().int().positive() },
      annotations: read,
      _meta: security,
    },
    ({ id }) => {
      const coffee = coffees.get(id);
      return coffee
        ? result(coffee)
        : { ...result({ error: "Coffee not found" }), isError: true };
    },
  );
  server.registerTool(
    "add_coffee",
    {
      title: "Add coffee",
      description:
        "Save a coffee. Only name is required. Ratings are 0–10; SCA scores are 0–100. Do not invent missing details.",
      inputSchema: coffeeSchema,
      annotations: write,
      _meta: security,
    },
    (args) => result(coffees.add(args)),
  );
  server.registerTool(
    "update_coffee",
    {
      title: "Update coffee",
      description:
        "Change supplied fields only. Use null to clear nullable fields. Tastings replaces the whole history; use [] to clear it, or add_tasting/delete_tasting for individual entries.",
      inputSchema: coffeePatchSchema.extend({
        id: z.number().int().positive(),
      }),
      annotations: { ...write, idempotentHint: true },
      _meta: security,
    },
    ({ id, ...patch }) => result(coffees.update(id, patch)),
  );
  server.registerTool(
    "add_tasting",
    {
      title: "Add tasting",
      description:
        "Record one brew with date (YYYY-MM-DD), preparation method, rating 0–10, and optional context notes.",
      inputSchema: tastingSchema.extend({ id: z.number().int().positive() }),
      annotations: write,
      _meta: security,
    },
    ({ id, ...tasting }) => result(coffees.addTasting(id, tasting)),
  );
  server.registerTool(
    "delete_tasting",
    {
      title: "Delete tasting",
      description:
        "Delete a tasting using its zero-based index in the stored tastings array returned by get_coffee. Fetch the current coffee before deleting.",
      inputSchema: z
        .object({
          id: z.number().int().positive(),
          index: z.number().int().nonnegative(),
        })
        .strict(),
      annotations: { ...write, destructiveHint: true },
      _meta: security,
    },
    ({ id, index }) => result(coffees.deleteTasting(id, index)),
  );
  server.registerTool(
    "delete_coffee",
    {
      title: "Delete coffee",
      description:
        "Permanently delete a coffee after the owner asks to delete it.",
      inputSchema: { id: z.number().int().positive() },
      annotations: { ...write, destructiveHint: true, idempotentHint: true },
      _meta: security,
    },
    ({ id }) => {
      coffees.delete(id);
      return result({ deleted: id });
    },
  );
  server.registerTool(
    "get_stats",
    {
      title: "Coffee collection statistics",
      description:
        "Get counts, favorites, average personal rating, and number of origins.",
      inputSchema: {},
      annotations: read,
      _meta: security,
    },
    () => result(coffees.stats()),
  );
  server.registerTool(
    "get_favorites",
    {
      title: "Favorite coffees",
      description: "List the owner’s favorite coffees.",
      inputSchema: { limit: z.number().int().min(1).max(100).default(20) },
      annotations: read,
      _meta: security,
    },
    ({ limit }) => result(coffees.list({ favoriteOnly: true, limit })),
  );
  return server;
}
