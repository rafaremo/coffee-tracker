import type { Prisma } from "@prisma/client";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();
const MCP_TOKEN = process.env.MCP_TOKEN || process.env.MCP_BEARER_TOKEN;
if (!MCP_TOKEN) throw new Error("MCP_TOKEN is required");
const MCP_PORT = parseInt(process.env.MCP_PORT || "3001", 10);

// Active SSE connections
const sessions = new Map<string, ServerResponse>();

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
    description: "Add a new coffee entry to the tracker",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Coffee name (required)" },
        brand: { type: "string" },
        country: { type: "string" },
        region: { type: "string" },
        variety: { type: "string" },
        process: { type: "string", description: "Washed, Natural, Honey, Anaerobic, etc." },
        roastLevel: { type: "string", description: "Light, Medium-Light, Medium, Medium-Dark, Dark" },
        myRating: { type: "number", description: "Personal rating 0-10" },
        scaScore: { type: "number", description: "SCA score 0-100" },
        tastingNotes: { type: "string", description: "Comma-separated descriptors: floral, citrus, chocolate..." },
        brewingMethods: { type: "string", description: "V60, Aeropress, Espresso, Chemex, French Press..." },
        tags: { type: "string" },
        isFavorite: { type: "boolean" },
        altitudeMasl: { type: "integer" },
        farm: { type: "string" },
        producer: { type: "string" },
        lot: { type: "string" },
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
    description: "Get statistics about your coffee collection: totals, averages, top countries, varieties, processes",
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

// ─── HTTP Helpers ───────────────────────────────────────────────────────────

function setCorsHeaders(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  setCorsHeaders(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, id: unknown, code: number, message: string) {
  sendJson(res, 200, { jsonrpc: "2.0", id, error: { code, message } });
}

function sendResult(res: ServerResponse, id: unknown, result: unknown) {
  sendJson(res, 200, { jsonrpc: "2.0", id, result });
}

function sendSse(res: ServerResponse, data: unknown) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function getAuthToken(req: IncomingMessage): string | null {
  const auth = req.headers["authorization"] || "";
  const match = (auth as string).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { reject(new Error("Invalid JSON")); }
    });
  });
}

// ─── Tool Handlers ──────────────────────────────────────────────────────────

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
    farm: coffee.farm,
    producer: coffee.producer,
    createdAt: coffee.createdAt,
  };
}

function sendToolResult(res: import("node:http").ServerResponse, id: unknown, result: unknown) {
  sendResult(res, id, { content: [{ type: "text", text: JSON.stringify(result) }] });
}

async function handleToolCall(id: unknown, name: string, args: Record<string, unknown>, res: ServerResponse) {
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
        if (!coffee) sendError(res, id, -32602, `Coffee ${args.id} not found`);
        else sendToolResult(res, id, { coffee: coffeeToDict(coffee) });
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

// ─── MCP Streamable HTTP Server ─────────────────────────────────────────────

const server = createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || "/";

  // GET /health
  if (req.method === "GET" && url === "/health") {
    try {
      await prisma.coffeeEntry.count();
      sendJson(res, 200, { status: "ok" });
    } catch {
      sendJson(res, 503, { status: "unavailable" });
    }
    return;
  }

  // GET /mcp - SSE stream for notifications (session establishment)
  if (req.method === "GET" && url === "/mcp") {
    const token = getAuthToken(req);
    if (!token || token !== MCP_TOKEN) {
      sendJson(res, 401, { error: "Unauthorized", message: "Invalid or missing Bearer token" });
      return;
    }

    const sessionId = randomUUID();
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Mcp-Session-Id": sessionId,
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });

    sessions.set(sessionId, res);

    // Send endpoint event
    sendSse(res, {
      jsonrpc: "2.0",
      id: null,
      method: "notifications/endpoint",
      params: { uri: `/mcp?sessionId=${sessionId}` },
    });

    req.on("close", () => { sessions.delete(sessionId); });
    return;
  }

  // POST /mcp - Main JSON-RPC endpoint
  if (req.method === "POST" && url === "/mcp") {
    const token = getAuthToken(req);
    if (!token || token !== MCP_TOKEN) {
      sendJson(res, 401, { error: "Unauthorized", message: "Invalid or missing Bearer token" });
      return;
    }

    const sessionId = req.headers["mcp-session-id"] as string || randomUUID();

    let msg: Record<string, unknown>;
    try {
      msg = await parseBody(req);
      if (!msg || Array.isArray(msg) || typeof msg !== "object") throw new Error("Invalid request");
    } catch {
      sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }

    const id = msg.id;
    const method = msg.method as string;

    // Handle initialize
    if (method === "initialize") {
      res.setHeader("Mcp-Session-Id", sessionId);
      res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
      sendJson(res, 200, {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: { listChanged: false },
          },
          serverInfo: { name: "coffee-tracker-mcp", version: "1.0.0" },
        },
      },
      // Set session header
      );
      return;
    }

    // Handle tools/list
    if (method === "tools/list") {
      sendResult(res, id, {
        tools: Object.entries(TOOLS).map(([name, spec]) => ({
          name,
          description: spec.description,
          inputSchema: spec.parameters,
        })),
      });
      return;
    }

    // Handle tools/call
    if (method === "tools/call") {
      const params = (msg.params as Record<string, unknown>) || {};
      await handleToolCall(id, params.name as string, (params.arguments as Record<string, unknown>) || {}, res);
      return;
    }

    if (method?.startsWith("notifications/")) {
      res.writeHead(202);
      res.end();
      return;
    }

    // Unknown method
    if (id !== undefined && id !== null) {
      sendError(res, id, -32601, `Method not found: ${method}`);
    } else {
      sendJson(res, 200, { jsonrpc: "2.0", error: { code: -32601, message: `Method not found: ${method}` } });
    }
    return;
  }

  // DELETE /mcp - Close session
  if (req.method === "DELETE" && url === "/mcp") {
    if (getAuthToken(req) !== MCP_TOKEN) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }
    const sessionId = req.headers["mcp-session-id"] as string;
    if (sessionId && sessions.has(sessionId)) {
      const sessionRes = sessions.get(sessionId)!;
      sessionRes.end();
      sessions.delete(sessionId);
    }
    res.writeHead(200);
    res.end();
    return;
  }

  // 404
  sendJson(res, 404, { error: "Not found", path: url });
});

server.listen(MCP_PORT, () => {
  console.log(`\u2615 Coffee Tracker MCP Streamable HTTP Server`);
  console.log(`   URL: http://localhost:${MCP_PORT}/mcp`);
  console.log(`   Health: http://localhost:${MCP_PORT}/health`);
  console.log("");
  console.log("Para conectar en ChatGPT:");
  console.log(`   Tipo: HTTP secuenciable`);
  console.log(`   URL: https://tu-dominio.com:${MCP_PORT}/mcp`);
});
