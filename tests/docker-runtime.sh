#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
export BETTER_AUTH_SECRET=runtime-test-secret-at-least-32-characters
export BETTER_AUTH_URL=http://127.0.0.1:3000
export MCP_TOKEN=runtime-test-private-token
export APP_DOMAIN=localhost
export MCP_DOMAIN=localhost
compose() { docker compose -p coffee-runtime-test -f docker-compose.yml -f tests/compose.yml "$@"; }
trap 'compose down --volumes' EXIT
compose up -d --build --wait
# Execute from inside the app container so published ports are unnecessary.
compose exec -T app node --input-type=module < tests/runtime.mjs
compose exec -T app node --input-type=module <<'JS'
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'node:fs';
const db = new PrismaClient();
writeFileSync('/app/data/runtime-count', String(await db.coffeeEntry.count()));
await db.$disconnect();
JS
compose restart
compose up -d --wait
compose exec -T app node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
const db = new PrismaClient();
assert.equal(await db.coffeeEntry.count(), Number(readFileSync('/app/data/runtime-count', 'utf8')));
const entry = await db.coffeeEntry.findFirst({ where: { photoPath: { not: null } } });
assert.equal((await fetch(`http://127.0.0.1:3000${entry.photoPath}`)).status, 200);
await db.$disconnect();
console.log('Restart persistence passed; no duplicate seed records.');
JS
