#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
export APP_PASSWORD=runtime-test-owner-password
export APP_URL=http://127.0.0.1:3000
export APP_DOMAIN=localhost
compose() { docker compose -p coffee-remix3-test -f docker-compose.yml -f tests/compose.yml "$@"; }
trap 'compose down --volumes' EXIT
compose up -d --build --wait
compose exec -T -e TEST_APP_URL=http://127.0.0.1:3000 app node --input-type=module < tests/runtime.mjs
compose exec -T app node --import remix/node-tsx --input-type=module <<'JS'
import {Store} from './app/db.ts';
import {Coffees} from './app/coffee.ts';
import {OwnerAuth} from './app/auth.ts';
import {CoffeeOAuth} from './app/oauth.ts';
import {configFromEnv} from './app/config.ts';
import {writeFileSync} from 'node:fs';
const config=configFromEnv();const store=new Store('/app/data/coffee.db');const coffees=new Coffees(store);
const auth=new OwnerAuth(store,config);const oauth=new CoffeeOAuth(auth);
// Exercise durable auth state through an actual process restart.
const client=await oauth.clientsStore.registerClient({redirect_uris:['http://127.0.0.1/callback'],token_endpoint_auth_method:'none'});
const {randomToken,hash}=await import('./app/auth.ts');const code=randomToken();
store.put('code',hash(code),{clientId:client.client_id,redirectUri:'http://127.0.0.1/callback',scopes:['coffee'],resource:oauth.resource.href,codeChallenge:'test'},120);
const tokens=await oauth.exchangeAuthorizationCode(client,code,undefined,'http://127.0.0.1/callback',oauth.resource);
writeFileSync('/app/data/runtime-state.json',JSON.stringify({count:coffees.list().total,cookie:auth.login().split(';')[0],token:tokens.access_token}));store.close();
JS
compose restart
compose up -d --wait
compose exec -T app node --import remix/node-tsx --input-type=module <<'JS'
import assert from 'node:assert/strict';
import {Store} from './app/db.ts';
import {Coffees} from './app/coffee.ts';
import {readFileSync} from 'node:fs';
const state=JSON.parse(readFileSync('/app/data/runtime-state.json','utf8'));
const store=new Store('/app/data/coffee.db');const coffees=new Coffees(store);
assert.equal(coffees.list().total,state.count);
const entry=coffees.list().coffees.find(c=>c.photoPath);
assert.equal((await fetch(`http://127.0.0.1:3000${entry.photoPath}`,{headers:{cookie:state.cookie},redirect:'manual'})).status,200);
const response=await fetch('http://127.0.0.1:3000/mcp',{method:'POST',headers:{authorization:`Bearer ${state.token}`,'content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})});
assert.equal(response.status,200);assert.equal((await response.json()).result.tools.length,7);
store.close();console.log('PASS: database, photos, browser sessions, OAuth tokens, and migrations survive restart');
JS
