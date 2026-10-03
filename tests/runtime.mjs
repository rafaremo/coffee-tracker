import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export async function verifyRuntime(base, password) {
  const fetchApp = (path, options = {}) =>
    fetch(new URL(path, base), { redirect: "manual", ...options });
  const form = (data, cookie) => ({
    method: "POST",
    headers: { origin: base, ...(cookie ? { cookie } : {}) },
    body: new URLSearchParams(data),
  });
  const json = (data) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  const cookies = (r) =>
    r.headers
      .getSetCookie()
      .map((v) => v.split(";")[0])
      .join("; ");
  assert.equal((await fetchApp("/health")).status, 200);
  assert.equal((await fetchApp("/")).status, 303);
  const loginPage = await fetchApp("/login");
  assert.equal(loginPage.status, 200);
  assert.equal(loginPage.headers.get("referrer-policy"), "same-origin");
  assert.equal(
    (await fetchApp("/login", form({ password: "wrong" }))).status,
    401,
  );
  assert.equal(
    (
      await fetchApp("/login", {
        ...form({ password }),
        headers: { origin: "https://attacker.example" },
      })
    ).status,
    403,
  );
  let response = await fetchApp("/login", form({ password }));
  assert.equal(response.status, 303, await response.text());
  const cookie = cookies(response);
  assert.ok(cookie.includes("coffee_session="));
  const home = await fetchApp("/", { headers: { cookie } });
  assert.equal(home.status, 200);
  assert.ok((await home.text()).includes("Coffee Journal"));
  response = await fetchApp(
    "/coffees/new",
    form({ name: "Runtime Ethiopia", myRating: "0", isFavorite: "on" }, cookie),
  );
  assert.equal(response.status, 303, await response.text());
  const location = response.headers.get("location");
  const id = Number(location.split("/").pop());
  assert.equal(
    (
      await fetchApp(
        "/coffees/new",
        form({ name: "Invalid", myRating: "11" }, cookie),
      )
    ).status,
    400,
  );
  assert.equal(
    (await fetchApp("/?search=ethiopia", { headers: { cookie } })).status,
    200,
  );
  assert.ok(
    (
      await (
        await fetchApp("/?search=ethiopia", { headers: { cookie } })
      ).text()
    ).includes("Runtime Ethiopia"),
  );
  assert.equal(
    (await fetchApp("/coffees/bad", { headers: { cookie } })).status,
    404,
  );
  const upload = new FormData();
  upload.set("name", "Runtime Ethiopia");
  upload.set(
    "photo",
    new Blob(
      [
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB9kAAAAASUVORK5CYII=",
          "base64",
        ),
      ],
      { type: "image/png" },
    ),
    "photo.png",
  );
  response = await fetchApp(`${location}/edit`, {
    method: "POST",
    headers: { cookie, origin: base },
    body: upload,
  });
  assert.equal(response.status, 303, await response.text());
  const detail = await (
    await fetchApp(location, { headers: { cookie } })
  ).text();
  const photo = detail.match(/src="(\/uploads\/[^\"]+)"/)?.[1];
  assert.ok(photo);
  response = await fetchApp(photo, { headers: { cookie } });
  assert.equal(response.status, 200, `${photo}: ${await response.text()}`);
  assert.equal((await fetchApp(photo)).status, 303);
  // OAuth discovery, dynamic registration, owner consent, and PKCE.
  response = await fetchApp(
    "/mcp",
    json({ jsonrpc: "2.0", id: 1, method: "initialize" }),
  );
  assert.equal(response.status, 401);
  assert.ok(
    response.headers.get("www-authenticate").includes("resource_metadata"),
  );
  const metadata = await (
    await fetchApp("/.well-known/oauth-authorization-server")
  ).json();
  assert.deepEqual(metadata.code_challenge_methods_supported, ["S256"]);
  const protectedResource = await (
    await fetchApp("/.well-known/oauth-protected-resource/mcp")
  ).json();
  assert.equal(protectedResource.resource, `${base}/mcp`);
  response = await fetch(metadata.registration_endpoint, {
    ...json({
      client_name: "Runtime client",
      redirect_uris: ["http://127.0.0.1/callback"],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    }),
    redirect: "manual",
  });
  assert.equal(response.status, 201);
  const registered = await response.json();
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorization = new URL(metadata.authorization_endpoint);
  authorization.search = new URLSearchParams({
    client_id: registered.client_id,
    redirect_uri: "http://127.0.0.1/callback",
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    scope: "coffee offline_access",
    state: "opaque-test-state",
    resource: `${base}/mcp`,
  }).toString();
  const wrongRedirect = new URL(authorization);
  wrongRedirect.searchParams.set(
    "redirect_uri",
    "https://attacker.example/callback",
  );
  assert.equal(
    (await fetch(wrongRedirect, { redirect: "manual" })).status,
    400,
  );
  response = await fetch(authorization, { redirect: "manual" });
  assert.equal(response.status, 303);
  const consent = response.headers.get("location");
  assert.equal((await fetchApp(consent)).status, 303);
  assert.ok(
    (await (await fetchApp(consent, { headers: { cookie } })).text()).includes(
      "Runtime client",
    ),
  );
  response = await fetchApp(consent, form({ decision: "allow" }, cookie));
  assert.equal(response.status, 303);
  const callback = new URL(response.headers.get("location"));
  assert.equal(callback.searchParams.get("state"), "opaque-test-state");
  const code = callback.searchParams.get("code");
  assert.ok(code);
  const exchange = {
    grant_type: "authorization_code",
    client_id: registered.client_id,
    code,
    code_verifier: verifier,
    redirect_uri: "http://127.0.0.1/callback",
    resource: `${base}/mcp`,
  };
  assert.equal(
    (
      await fetchApp(
        "/token",
        form({ ...exchange, code_verifier: "wrong-verifier" }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await fetchApp(
        "/token",
        form({ ...exchange, resource: "https://attacker.example/mcp" }),
      )
    ).status,
    400,
  );
  response = await fetchApp("/token", form(exchange));
  assert.equal(response.status, 200, await response.clone().text());
  const tokens = await response.json();
  assert.equal((await fetchApp("/token", form(exchange))).status, 400);
  const client = new Client({ name: "coffee-regression", version: "1.0.0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
      requestInit: {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    }),
  );
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 7);
  assert.equal(
    tools.tools.find((t) => t.name === "delete_coffee").annotations
      .destructiveHint,
    true,
  );
  const call = async (name, args = {}) => {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(!result.isError, JSON.stringify(result));
    return JSON.parse(result.content[0].text);
  };
  assert.ok(
    (await call("list_coffees", { search: "runtime ethiopia" })).coffees.some(
      (c) => c.id === id,
    ),
  );
  const added = await call("add_coffee", {
    name: "MCP Colombia",
    myRating: 8.5,
    isFavorite: true,
  });
  assert.equal(
    (await call("update_coffee", { id: added.id, brand: "Test roaster" }))
      .isFavorite,
    true,
  );
  assert.equal(
    (await call("get_coffee", { id: added.id })).name,
    "MCP Colombia",
  );
  assert.ok((await call("get_favorites")).total >= 1);
  assert.ok((await call("get_stats")).totalEntries >= 2);
  assert.ok(
    (
      await client.callTool({
        name: "add_coffee",
        arguments: { name: "Invalid", myRating: 99 },
      })
    ).isError,
  );
  await call("delete_coffee", { id: added.id });
  assert.ok(
    (await client.callTool({ name: "get_coffee", arguments: { id: added.id } }))
      .isError,
  );
  await client.close();
  response = await fetchApp(
    "/token",
    form({
      grant_type: "refresh_token",
      client_id: registered.client_id,
      refresh_token: tokens.refresh_token,
      resource: `${base}/mcp`,
    }),
  );
  assert.equal(response.status, 200);
  const renewed = await response.json();
  assert.equal(
    (
      await fetchApp(
        "/token",
        form({
          grant_type: "refresh_token",
          client_id: registered.client_id,
          refresh_token: tokens.refresh_token,
        }),
      )
    ).status,
    400,
  );
  await fetchApp(
    "/revoke",
    form({ client_id: registered.client_id, token: renewed.refresh_token }),
  );
  assert.equal(
    (
      await fetchApp("/mcp", {
        ...json({}),
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${renewed.access_token}`,
        },
      })
    ).status,
    401,
  );
  response = await fetchApp("/logout", form({}, cookie));
  assert.equal(response.status, 303);
  assert.equal((await fetchApp(location, { headers: { cookie } })).status, 303);
  console.log(
    "PASS: owner login, CSRF, coffee CRUD, validation, photos, OAuth consent/PKCE/rotation/revocation, and official MCP client tools",
  );
  return { id, photo, cookie };
}
if (process.env.TEST_APP_URL)
  await verifyRuntime(process.env.TEST_APP_URL, process.env.APP_PASSWORD);
