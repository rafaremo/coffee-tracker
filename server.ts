import { configFromEnv } from "./app/config.ts";
import { createApp } from "./app/server.ts";
const config = configFromEnv();
const app = createApp(config);
app.server.listen(config.port, "0.0.0.0", () =>
  console.log(
    `Coffee Journal listening on port ${config.port}; MCP at ${config.origin}/mcp`,
  ),
);
let closing = false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    void app.close().then(
      () => process.exit(0),
      (error) => {
        console.error(error);
        process.exit(1);
      },
    );
  });
