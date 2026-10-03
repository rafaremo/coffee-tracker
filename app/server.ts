import { contentSecurityPolicy } from "./security.ts";
import express from "express";
import { createServer } from "node:http";
import { join } from "node:path";
import { createRequestListener } from "remix/node-fetch-server";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  mcpAuthRouter,
  getOAuthProtectedResourceMetadataUrl,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { Store } from "./db.ts";
import { Coffees } from "./coffee.ts";
import { OwnerAuth } from "./auth.ts";
import { CoffeeOAuth } from "./oauth.ts";
import { createWebRouter } from "./router.tsx";
import { createCoffeeMcp } from "./mcp.ts";
import type { Config } from "./config.ts";

export function createApp(config: Config) {
  const store = new Store(join(config.dataDir, "coffee.db"));
  const coffees = new Coffees(store);
  const owner = new OwnerAuth(store, config);
  const oauth = new CoffeeOAuth(owner);
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", contentSecurityPolicy());
    next();
  });
  app.use(
    mcpAuthRouter({
      provider: oauth,
      issuerUrl: new URL(config.origin),
      resourceServerUrl: oauth.resource,
      scopesSupported: ["coffee", "offline_access"],
      resourceName: "Coffee Journal",
      // Single-owner service: global limits avoid trusting proxy-supplied IP headers.
      authorizationOptions: { rateLimit: { keyGenerator: () => "owner" } },
      tokenOptions: { rateLimit: { keyGenerator: () => "owner" } },
      revocationOptions: { rateLimit: { keyGenerator: () => "owner" } },
      clientRegistrationOptions: {
        clientSecretExpirySeconds: 0,
        rateLimit: { keyGenerator: () => "owner" },
      },
    }),
  );
  const bearer = requireBearerAuth({
    verifier: oauth,
    requiredScopes: ["coffee"],
    expectedResource: oauth.resource,
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(oauth.resource),
  });
  app.all(
    "/mcp",
    (req, res, next) => {
      if (req.headers.origin && req.headers.origin !== config.origin) {
        res.status(403).json({ error: "Invalid request origin" });
        return;
      }
      next();
    },
    bearer,
    express.json({ limit: "256kb" }),
    async (req, res) => {
      const server = createCoffeeMcp(coffees);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on("close", () => {
        void server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    },
  );
  const web = createWebRouter(coffees, owner, oauth);
  app.use(
    createRequestListener(web, {
      host: new URL(config.origin).host,
      protocol: new URL(config.origin).protocol,
    }),
  );
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const status =
        error && typeof error === "object" && "status" in error
          ? Number(error.status)
          : 500;
      if (status >= 500) console.error("Request failed", error);
      if (!res.headersSent)
        res.status(status >= 400 && status < 600 ? status : 500).json({
          error: status < 500 ? "Invalid request" : "Internal server error",
        });
    },
  );
  const server = createServer(app);
  const cleanup = setInterval(() => store.cleanup(), 60 * 60 * 1000);
  cleanup.unref();
  return {
    server,
    store,
    coffees,
    oauth,
    owner,
    close: async () => {
      clearInterval(cleanup);
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      store.close();
    },
  };
}
