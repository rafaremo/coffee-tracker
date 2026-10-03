import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { createApp } from "../app/server.ts";
// @ts-expect-error The same JS smoke suite runs against Docker without a TS loader.
import { verifyRuntime } from "./runtime.mjs";

test("full owner and MCP runtime", async () => {
  const probe = createServer();
  await new Promise<void>((r) => probe.listen(0, "127.0.0.1", r));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((r) => probe.close(() => r()));
  const dir = mkdtempSync(join(tmpdir(), "coffee-server-"));
  const config = {
    port,
    origin: `http://127.0.0.1:${port}`,
    password: "test-password-at-least-16",
    dataDir: dir,
  };
  const app = createApp(config);
  await new Promise<void>((r) => app.server.listen(port, "127.0.0.1", r));
  try {
    const result = await verifyRuntime(config.origin, config.password);
    assert.ok(app.coffees.get(result.id));
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("local Claude stdio transport works from another working directory", async () => {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StdioClientTransport } =
    await import("@modelcontextprotocol/sdk/client/stdio.js");
  const { fileURLToPath } = await import("node:url");
  const dir = mkdtempSync(join(tmpdir(), "coffee-stdio-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      "--import",
      fileURLToPath(
        new URL("../node_modules/remix/dist/node-tsx.js", import.meta.url),
      ),
      fileURLToPath(new URL("../mcp-stdio.ts", import.meta.url)),
    ],
    cwd: tmpdir(),
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      ),
      DATA_DIR: dir,
    },
  });
  const client = new Client({ name: "claude-stdio-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    assert.equal((await client.listTools()).tools.length, 7);
    const result = await client.callTool({
      name: "add_coffee",
      arguments: { name: "Local Claude coffee" },
    });
    assert.ok(!result.isError);
  } finally {
    await client.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
