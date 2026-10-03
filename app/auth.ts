import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Store } from "./db.ts";
import type { Config } from "./config.ts";
export const randomToken = () => randomBytes(32).toString("base64url");
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export class OwnerAuth {
  readonly fingerprint: string;
  constructor(
    readonly store: Store,
    readonly config: Config,
  ) {
    this.fingerprint = hash(config.password);
  }
  checkPassword(password: string) {
    return timingSafeEqual(
      Buffer.from(hash(password)),
      Buffer.from(this.fingerprint),
    );
  }
  session(request: Request) {
    const token = request.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("coffee_session="))
      ?.slice(15);
    if (!token) return undefined;
    return this.store.get<{ fingerprint: string }>("session", hash(token))
      ?.fingerprint === this.fingerprint
      ? token
      : undefined;
  }
  cookie(token: string, maxAge = 30 * 86400) {
    return `coffee_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${this.config.origin.startsWith("https:") ? "; Secure" : ""}`;
  }
  login() {
    const token = randomToken();
    this.store.put(
      "session",
      hash(token),
      { fingerprint: this.fingerprint },
      30 * 86400,
    );
    return this.cookie(token);
  }
  logout(request: Request) {
    const token = this.session(request);
    if (token) this.store.remove("session", hash(token));
    return this.cookie("", 0);
  }
  require(request: Request) {
    if (!this.session(request))
      throw new Response(null, {
        status: 303,
        headers: {
          location: `/login?next=${encodeURIComponent(new URL(request.url).pathname + new URL(request.url).search)}`,
        },
      });
  }
  checkOrigin(request: Request) {
    if (request.headers.get("origin") !== this.config.origin)
      throw new Response("Invalid request origin", { status: 403 });
  }
}
