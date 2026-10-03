import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolve, join } from "node:path";
import { Store } from "./app/db.ts";
import { Coffees } from "./app/coffee.ts";
import { createCoffeeMcp } from "./app/mcp.ts";
const store = new Store(
  join(resolve(process.env.DATA_DIR || "./data"), "coffee.db"),
);
const server = createCoffeeMcp(new Coffees(store));
await server.connect(new StdioServerTransport());
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await server.close();
  store.close();
  process.exit(0);
}
process.stdin.on("end", () => void close());
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => void close());
