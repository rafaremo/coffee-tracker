import { resolve } from "node:path";
export function configFromEnv(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "production" && !env.APP_URL)
    throw new Error("Set APP_URL to your public origin");
  const origin = new URL(env.APP_URL || "http://localhost:3000");
  if (
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  )
    throw new Error(
      "APP_URL must be an origin, for example https://coffee.example.com",
    );
  if (
    origin.protocol !== "https:" &&
    !(
      origin.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
    )
  )
    throw new Error("APP_URL must use HTTPS except on localhost");
  const password = env.APP_PASSWORD || "";
  if (password.length < 16)
    throw new Error(
      "Set APP_PASSWORD to a private password of at least 16 characters",
    );
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid PORT");
  return {
    origin: origin.origin,
    password,
    port,
    dataDir: resolve(env.DATA_DIR || "./data"),
  };
}
export type Config = ReturnType<typeof configFromEnv>;
