#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";
import * as readline from "readline";

const prisma = new PrismaClient();

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./data/dev.db";
}

const TOOLS: Record<string, { description: string; parameters: object }> = {
  list_coffees: {
    description: "List all coffee entries with optional filters",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string" },
        favoriteOnly: { type: "boolean" },
        limit: { type: "integer", default: 20 },
        skip: { type: "integer", default: 0 },
      },
    },
  },
  get_coffee: {
    description: "Get detailed info about a specific coffee by ID",
    parameters: {
      type: "object",
      properties: { id: { type: "integer" } },
      required: ["id"],
    },
  },
  add_coffee: {
    description: "Add a new coffee entry",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        brand: { type: "string" },
        country: { type: "string" },
        region: { type: "string" },
        variety: { type: "string" },
        process: { type: "string" },
        roastLevel: { type: "string" },
        myRating: { type: "number" },
        scaScore: { type: "number" },
        tastingNotes: { type: "string" },
        brewingMethods: { type: "string" },
        tags: { type: "string" },
        isFavorite: { type: "boolean" },
      },
      required: ["name"],
    },
  },
  update_coffee: {
    description: "Update an existing coffee entry",
    parameters: {
      type: "object",
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        brand: { type: "string" },
        country: { type: "string" },
        region: { type: "string" },
        variety: { type: "string" },
        process: { type: "string" },
        roastLevel: { type: "string" },
        myRating: { type: "number" },
        scaScore: { type: "number" },
        tastingNotes: { type: "string" },
        brewingMethods: { type: "string" },
        tags: { type: "string" },
        isFavorite: { type: "boolean" },
      },
      required: ["id"],
    },
  },
  delete_coffee: {
    description: "Delete a coffee entry by ID",
    parameters: {
      type: "object",
      properties: { id: { type: "integer" } },
      required: ["id"],
    },
  },
  get_stats: {
    description: "Get statistics about your coffee collection",
    parameters: { type: "object", properties: {} },
  },
  get_favorites: {
    description: "Get your favorite coffees",
    parameters: {
      type: "object",
      properties: { limit: { type: "integer", default: 10 } },
    },
  },
};

function send(msg: unknown) {
  console.log(JSON.stringify(msg));
}

function sendResult(id: unknown, result: unknown) {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id: unknown, code: number, message: string) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function coffeeToDict(coffee: Record<string, unknown>) {
  return {
    id: coffee.id,
    name: coffee.name,
    brand: coffee.brand,
    country: coffee.country,
    region: coffee.region,
    variety: coffee.variety,
    process: coffee.process,
    roastLevel: coffee.roastLevel,
    myRating: coffee.myRating,
    scaScore: coffee.scaScore,
    tastingNotes: coffee.tastingNotes,
    brewingMethods: coffee.brewingMethods,
    tags: coffee.tags,
    isFavorite: coffee.isFavorite,
  };
}

async function handleToolCall(id: unknown, name: string, args: Record<string, unknown>) {
  try {
    switch (name) {
      case "list_coffees": {
        const where: Record<string, unknown> = {};
        if (args.favoriteOnly) where.isFavorite = true;
        if (args.search) {
          where.OR = [
            { name: { contains: args.search as string, mode: "insensitive" } },
            { brand: { contains: args.search as string, mode: "insensitive" } },
          ];
        }
        const items = await prisma.coffeeEntry.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (args.skip as number) || 0,
          take: (args.limit as number) || 20,
        });
        const total = await prisma.coffeeEntry.count({ where });
        sendResult(id, { total, coffees: items.map(coffeeToDict) });
        break;
      }
      case "get_coffee": {
        const coffee = await prisma.coffeeEntry.findUnique({ where: { id: args.id as number } });
        if (!coffee) {
          sendError(id, -32602, `Coffee ${args.id} not found`);
        } else {
          sendResult(id, { coffee: coffeeToDict(coffee) });
        }
        break;
      }
      case "add_coffee": {
        const coffee = await prisma.coffeeEntry.create({ data: args as never });
        sendResult(id, { coffee: coffeeToDict(coffee), message: `Added coffee: ${coffee.name}` });
        break;
      }
      case "update_coffee": {
        const { id: cid, ...data } = args;
        const coffee = await prisma.coffeeEntry.update({ where: { id: cid as number }, data: data as never });
        sendResult(id, { coffee: coffeeToDict(coffee), message: `Updated coffee: ${coffee.name}` });
        break;
      }
      case "delete_coffee": {
        await prisma.coffeeEntry.delete({ where: { id: args.id as number } });
        sendResult(id, { message: `Deleted coffee ${args.id}` });
        break;
      }
      case "get_stats": {
        const total = await prisma.coffeeEntry.count();
        const favorites = await prisma.coffeeEntry.count({ where: { isFavorite: true } });
        const avgRating = await prisma.coffeeEntry.aggregate({ _avg: { myRating: true } });
        const avgSca = await prisma.coffeeEntry.aggregate({ _avg: { scaScore: true } });
        sendResult(id, {
          totalEntries: total,
          totalFavorites: favorites,
          avgRating: avgRating._avg.myRating ? Math.round(avgRating._avg.myRating * 100) / 100 : null,
          avgScaScore: avgSca._avg.scaScore ? Math.round(avgSca._avg.scaScore * 100) / 100 : null,
        });
        break;
      }
      case "get_favorites": {
        const items = await prisma.coffeeEntry.findMany({
          where: { isFavorite: true },
          orderBy: { createdAt: "desc" },
          take: (args.limit as number) || 10,
        });
        sendResult(id, { total: items.length, coffees: items.map(coffeeToDict) });
        break;
      }
      default:
        sendError(id, -32601, `Unknown tool: ${name}`);
    }
  } catch (err) {
    sendError(id, -32603, String(err));
  }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    return;
  }

  const id = msg.id;
  const method = msg.method as string;

  if (method === "initialize") {
    sendResult(id, {
      protocolVersion: "2024-11-05",
      capabilities: {},
      serverInfo: { name: "coffee-tracker-mcp", version: "1.0.0" },
    });
  } else if (method === "tools/list") {
    sendResult(id, {
      tools: Object.entries(TOOLS).map(([name, spec]) => ({
        name,
        description: spec.description,
        inputSchema: spec.parameters,
      })),
    });
  } else if (method === "tools/call") {
    const params = (msg.params as Record<string, unknown>) || {};
    await handleToolCall(id, params.name as string, (params.arguments as Record<string, unknown>) || {});
  } else if (id !== undefined && id !== null) {
    sendError(id, -32601, `Method not found: ${method}`);
  }
});
