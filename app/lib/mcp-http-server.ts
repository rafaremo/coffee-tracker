import type { Prisma } from "@prisma/client";
import { createServer } from "node:http";
import { PrismaClient } from "@prisma/client";
import { URL } from "node:url";

const prisma = new PrismaClient();
const MCP_TOKEN = process.env.MCP_TOKEN || process.env.MCP_BEARER_TOKEN;
if (!MCP_TOKEN) throw new Error("MCP_TOKEN is required");
const MCP_PORT = parseInt(process.env.MCP_PORT || "3001", 10);

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

function sendJson(res: any, status: number, data: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  });
  res.end(JSON.stringify(data));
}

function sendError(res: any, id: unknown, code: number, message: string) {
  sendJson(res, 200, { jsonrpc: "2.0", id, error: { code, message } });
}

function sendResult(res: any, id: unknown, result: unknown) {
  sendJson(res, 200, { jsonrpc: "2.0", id, result });
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
    photoPath: coffee.photoPath,
    altitudeMasl: coffee.altitudeMasl,
    createdAt: coffee.createdAt,
  };
}

function getAuthToken(req: any): string | null {
  const auth = req.headers["authorization"] || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function sendToolResult(res: import("node:http").ServerResponse, id: unknown, result: unknown) {
  sendResult(res, id, { content: [{ type: "text", text: JSON.stringify(result) }] });
}

async function handleToolCall(id: unknown, name: string, args: Record<string, unknown>, res: any) {
  try {
    switch (name) {
      case "list_coffees": {
        const where: Prisma.CoffeeEntryWhereInput = {};
        if (args.favoriteOnly) where.isFavorite = true;
        if (args.search) {
          where.OR = [
            { name: { contains: args.search as string } },
            { brand: { contains: args.search as string } },
          ];
        }
        const items = await prisma.coffeeEntry.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (args.skip as number) || 0,
          take: (args.limit as number) || 20,
        });
        const total = await prisma.coffeeEntry.count({ where });
        sendToolResult(res, id, { total, coffees: items.map(coffeeToDict) });
        break;
      }
      case "get_coffee": {
        const coffee = await prisma.coffeeEntry.findUnique({ where: { id: args.id as number } });
        if (!coffee) {
          sendError(res, id, -32602, `Coffee ${args.id} not found`);
        } else {
          sendToolResult(res, id, { coffee: coffeeToDict(coffee) });
        }
        break;
      }
      case "add_coffee": {
        const coffee = await prisma.coffeeEntry.create({ data: args as never });
        sendToolResult(res, id, { coffee: coffeeToDict(coffee), message: `Added coffee: ${coffee.name}` });
        break;
      }
      case "update_coffee": {
        const { id: cid, ...data } = args;
        const coffee = await prisma.coffeeEntry.update({ where: { id: cid as number }, data: data as never });
        sendToolResult(res, id, { coffee: coffeeToDict(coffee), message: `Updated coffee: ${coffee.name}` });
        break;
      }
      case "delete_coffee": {
        await prisma.coffeeEntry.delete({ where: { id: args.id as number } });
        sendToolResult(res, id, { message: `Deleted coffee ${args.id}` });
        break;
      }
      case "get_stats": {
        const total = await prisma.coffeeEntry.count();
        const favorites = await prisma.coffeeEntry.count({ where: { isFavorite: true } });
        const avgRating = await prisma.coffeeEntry.aggregate({ _avg: { myRating: true } });
        const avgSca = await prisma.coffeeEntry.aggregate({ _avg: { scaScore: true } });
        sendToolResult(res, id, {
          totalEntries: total,
          totalFavorites: favorites,
          avgRating: avgRating._avg.myRating != null ? Math.round(avgRating._avg.myRating * 100) / 100 : null,
          avgScaScore: avgSca._avg.scaScore != null ? Math.round(avgSca._avg.scaScore * 100) / 100 : null,
        });
        break;
      }
      case "get_favorites": {
        const items = await prisma.coffeeEntry.findMany({
          where: { isFavorite: true },
          orderBy: { createdAt: "desc" },
          take: (args.limit as number) || 10,
        });
        sendToolResult(res, id, { total: items.length, coffees: items.map(coffeeToDict) });
        break;
      }
      default:
        sendError(res, id, -32601, `Unknown tool: ${name}`);
    }
  } catch (err) {
    sendError(res, id, -32603, String(err));
  }
}

const server = createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    });
    res.end();
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    try {
      await prisma.coffeeEntry.count();
      sendJson(res, 200, { status: "ok" });
    } catch {
      sendJson(res, 503, { status: "unavailable" });
    }
    return;
  }

  // Auth check
  const token = getAuthToken(req);
  if (!token || token !== MCP_TOKEN) {
    sendJson(res, 401, { error: "Unauthorized", message: "Invalid or missing Bearer token" });
    return;
  }

  // MCP endpoints
  if (req.method === "POST" && req.url === "/mcp") {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(body);
      if (!msg || Array.isArray(msg) || typeof msg !== "object") throw new Error("Invalid request");
    } catch {
      sendJson(res, 400, { error: "Invalid JSON" });
      return;
    }

    const id = msg.id;
    const method = msg.method as string;

    if (method === "initialize") {
      sendResult(res, id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "coffee-tracker-mcp", version: "1.0.0" },
      });
    } else if (method === "tools/list") {
      sendResult(res, id, {
        tools: Object.entries(TOOLS).map(([name, spec]) => ({
          name,
          description: spec.description,
          inputSchema: spec.parameters,
        })),
      });
    } else if (method === "tools/call") {
      const params = (msg.params as Record<string, unknown>) || {};
      await handleToolCall(id, params.name as string, (params.arguments as Record<string, unknown>) || {}, res);
    } else {
      if (id !== undefined && id !== null) {
        sendError(res, id, -32601, `Method not found: ${method}`);
      } else {
        sendJson(res, 200, { jsonrpc: "2.0", error: { code: -32601, message: `Method not found: ${method}` } });
      }
    }
    return;
  }

  sendJson(res, 404, { error: "Not found", path: req.url });
});

server.listen(MCP_PORT, () => {
  console.log(`☕ Coffee Tracker MCP Server running on http://localhost:${MCP_PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   POST /mcp     - MCP JSON-RPC endpoint`);
  console.log(`   GET  /health  - Health check`);
});
