# Coffee Journal

A personal coffee tracker built with **Remix 3**, Node's built-in SQLite, and the
**official Model Context Protocol SDK**. One collection, one owner password, one
container. The web app and assistants always use the same data.

## What it does

- Save coffees with a name; add origins, roast details, ratings, tasting notes,
  brewing methods, purchase details, favorites, and photos when you have them.
- Search your collection, filter favorites, and see simple collection statistics.
- Ask ChatGPT or Claude to read, add, update, or delete coffee entries.
- Approve assistant connections through OAuth; disconnect them from the Assistants page.
- Use the responsive web UI without a client JavaScript bundle.

This is a single-owner app. There is no signup, user management, Prisma generation,
separate MCP service, or automatic sample-data seeding.

## Local setup

Install **Node.js 24.3 or newer** (Node 24 LTS recommended), then:

```sh
npm ci
cp .env.example .env
# Set APP_PASSWORD in .env to a unique password of at least 16 characters.
# Example password generator: openssl rand -hex 24
npm run dev
```

Open `http://localhost:3000` and enter that password. The database and upload
directory are created automatically before requests are accepted.

`npm start` runs the production server. `npm run build` performs TypeScript
validation: Remix 3 runs TypeScript/JSX through its `remix/node-tsx` loader, so
there is no Remix 2/Vite build output to generate.

The implementation follows [Remix 3's guide](https://guides.remix.run/start-here/):
typed route definitions, a Fetch router, native Remix components, server rendering,
and ordinary HTML forms. Express handles the MCP SDK's OAuth/transport middleware
and passes web requests to the Remix adapter.

## Docker / Coolify

Use the repository's Docker Compose configuration. Deploy **one service**, `app`,
with port **3000** behind your HTTPS reverse proxy. Set:

| Variable       | Value                                                                   |
| -------------- | ----------------------------------------------------------------------- |
| `APP_URL`      | The exact public origin, e.g. `https://coffee.example.com`              |
| `APP_DOMAIN`   | The hostname for the included Traefik labels, e.g. `coffee.example.com` |
| `APP_PASSWORD` | Your unique owner password, at least 16 characters                      |

The container already sets `DATA_DIR=/app/data` and `PORT=3000`.

```sh
docker compose up -d --build
docker compose logs --tail=100 app
```

The Compose file supplies Traefik labels; it does not install a reverse proxy.
For another proxy, route your domain to the container's port 3000. Route **all
paths** on that origin, including `/mcp`, `/authorize`, `/token`, `/register`,
`/revoke`, and `/.well-known/*`. Do not put proxy basic authentication in front of
these routes. The application supplies owner login and OAuth authentication.

Use one app replica and retain the `coffee-data` volume at `/app/data`. The image
runs as the standard Node user (UID 1000); an existing bind mount must be writable
by that user. `/health` checks database availability. The migrations run before
the HTTP listener starts and are checksum-verified on subsequent starts.
Migration `002_backfill_tastings.sql` seeds one tasting for existing rated coffees
without a tasting log, using the creation date and up to 200 characters of brewing
methods (or `Registro inicial`). Existing tasting arrays, including empty ones,
are preserved; notes are not copied.

This is the fresh-app Remix 3 replacement. It uses `coffee.db`; legacy `prod.db`
or `prisma/data/*.db` files are not imported or modified. The old `DATABASE_URL`,
`BETTER_AUTH_*`, `MCP_TOKEN`, `MCP_DOMAIN`, and second MCP container are no longer
used. Start a fresh volume for this new app, or retain old files separately if you
have experimental data you want to keep.

## Connect ChatGPT and Claude

Both remote clients use the same URL:

```text
https://coffee.example.com/mcp
```

1. In your assistant's custom app/plugin or connector settings, add that URL.
2. Select **OAuth** if asked. Discovery and dynamic client registration are
   provided automatically; no client ID, secret, or API key needs to be pasted.
3. Sign in on the coffee app's own page with your owner password.
4. Review the client and return address, then approve the connection.
5. Ask about your coffees, or ask the assistant to add a new one.

For example: “Add a washed Ethiopian coffee from Onyx. Jasmine and bergamot notes,
9.2 out of 10, and mark it as a favorite.”

The app supports Streamable HTTP, OAuth authorization code with S256 PKCE,
resource-bound tokens, rotating refresh tokens, and revocation. The SDK handles
protocol negotiation and MCP request/response validation. Nine tools are exposed:
`list_coffees`, `get_coffee`, `add_coffee`, `update_coffee`, `delete_coffee`,
`get_stats`, `get_favorites`, `add_tasting`, and `delete_tasting`. Tool schemas and web forms share validation rules.
The delete tools are marked destructive; read tools are marked read-only.

Custom connector availability depends on your assistant account/workspace.
Follow the current [ChatGPT connection instructions](https://developers.openai.com/plugins/deploy/connect-chatgpt)
and [Claude remote connector instructions](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).
ChatGPT's [OAuth requirements](https://developers.openai.com/plugins/build/auth)
are why the app has an owner approval flow instead of a hard-coded bearer token.
Actual ChatGPT/Claude account linking requires your deployed HTTPS endpoint; the
local suite verifies the protocol using the official SDK client.

### Local Claude / stdio

For a client that supports local stdio servers, adapt `mcp-config.json` with
absolute paths to Node 24 and this checkout. The command is equivalent to:

```sh
DATA_DIR=/absolute/path/to/coffee-tracker/data npm run mcp
```

The supplied JSON uses the absolute Remix loader path so it works even when the
client starts in a different working directory. Stdio relies on local filesystem
access and does not require your web password. Use the remote OAuth URL if your
web app is hosted elsewhere; a local `DATA_DIR` is a separate collection unless
it points at that same filesystem.

## Storage and access

- `DATA_DIR/coffee.db`: coffees, migrations, browser sessions, registered OAuth
  clients, grants, and hashed token lookup keys. SQLite WAL mode is enabled.
- `DATA_DIR/uploads/`: photos, authenticated when served by the app.
- Browser sessions last 30 days. Access tokens last one hour; assistant grants
  and refresh tokens last up to 90 days, after which reconnect in your assistant.
- **Assistants → Disconnect all assistants** revokes every remote grant immediately.
- Changing `APP_PASSWORD` and restarting invalidates existing browser sessions
  and assistant grants. There is no email-based password recovery.

Back up the entire data directory while the app and any local stdio process are
stopped, including any SQLite WAL files. Restore it with the same owner password
if you want existing sessions/connections to remain valid. Keep the backup private.
Deleting a coffee removes its record; unused uploaded image files are retained
on disk, so backups can still contain those images.

## Checks

```sh
npm run typecheck
npm test
npm audit
tests/docker-runtime.sh
```

The tests cover input validation, zero ratings, case-insensitive search, partial
updates, migrations, owner login/logout, CSRF checks, private uploads, OAuth
registration/consent/PKCE, redirect and resource validation, one-time codes, refresh
rotation, revocation, official MCP client calls, and local stdio from a different
working directory. The Docker suite additionally verifies non-root startup and
persistence of records, photos, browser sessions, and OAuth tokens after restart.
It creates and removes only an isolated test stack and volume.

The dependency audit is clean as of this migration. The `esbuild` override keeps
Remix's transitive test tooling on a patched release; revisit it when Remix updates
that dependency. A clean audit is a dependency snapshot, not a security guarantee.

## Project layout

```text
server.ts                 Node entrypoint and graceful shutdown
mcp-stdio.ts              Local MCP transport
app/routes.ts             Typed Remix route map
app/router.tsx            Web actions and owner access boundary
app/ui/pages.tsx          Native Remix 3 components
app/coffee.ts             Shared model, validation, and collection operations
app/db.ts                 SQLite store and migration runner
app/auth.ts               Single-owner browser sessions
app/oauth.ts              OAuth provider backed by SQLite
app/mcp.ts                Shared MCP tools
app/server.ts             HTTP/OAuth/MCP and Remix adapters
app/uploads.ts            Bounded image uploads and private file responses
db/migrations/            Versioned SQL
public/style.css          Responsive styles
tests/                    Database, protocol, and Docker regression tests
```

MIT — see LICENSE.

### Per-brew tasting log

Each coffee can have an optional embedded `tastings` array. Each entry has a
`date` (YYYY-MM-DD), a free-text `method`, a `rating` from 0 to 10, and optional
`notes`. Coffee-level ratings and personal notes remain separate. The detail page
shows the history newest-first, its count and average, and the latest tasting
rating. Entries on the same date show the most recently added first.

Use `add_tasting` with the coffee `id` and tasting fields, or `delete_tasting`
with the coffee `id` and the zero-based `index` from a fresh `get_coffee` response.
Indexes refer to the stored array, not the sorted display. `add_coffee` and
`update_coffee` also accept `tastings`; updating that field replaces the full array.

Authenticated web actions accept form POSTs or `application/json` POSTs:
`/coffees/:id/tastings` adds an entry and
`/coffees/:id/tastings/:index/delete` deletes one. JSON requests return the updated
coffee; forms redirect to the tasting log. Existing session and origin checks apply.
