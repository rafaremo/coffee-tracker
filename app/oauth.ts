import type {
  OAuthServerProvider,
  AuthorizationParams,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type {
  OAuthClientInformationFull,
  OAuthTokens,
  OAuthTokenRevocationRequest,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  InvalidGrantError,
  InvalidTokenError,
  InvalidScopeError,
  InvalidTargetError,
  InvalidClientMetadataError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { Response } from "express";
import { hash, randomToken, type OwnerAuth } from "./auth.ts";

export type PendingAuthorization = {
  clientId: string;
  clientName: string;
  redirectUri: string;
  state?: string;
  scopes: string[];
  codeChallenge: string;
  resource: string;
};
type Grant = {
  clientId: string;
  scopes: string[];
  resource: string;
  grantId: string;
};
type Code = PendingAuthorization;
type Token = Grant & { expiresAt: number };
const scopesSupported = ["coffee", "offline_access"];

export class CoffeeOAuth implements OAuthServerProvider {
  readonly resource: URL;
  readonly clientsStore: OAuthRegisteredClientsStore;
  constructor(readonly owner: OwnerAuth) {
    this.resource = new URL("/mcp", owner.config.origin);
    this.clientsStore = {
      getClient: (id) =>
        owner.store.get<OAuthClientInformationFull>("client", id),
      registerClient: (input) => {
        const count = Number(
          owner.store.db
            .prepare("SELECT count(*) AS n FROM state WHERE namespace='client'")
            .get()!.n,
        );
        if (count >= 200)
          throw new InvalidClientMetadataError(
            "Client registration limit reached",
          );
        for (const redirect of input.redirect_uris) {
          const url = new URL(redirect);
          if (
            url.hash ||
            url.username ||
            url.password ||
            (url.protocol !== "https:" &&
              !(
                url.protocol === "http:" &&
                ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
              ))
          )
            throw new InvalidClientMetadataError(
              "Use HTTPS or a loopback redirect URI",
            );
        }
        const client = {
          ...input,
          client_id: randomToken(),
          client_id_issued_at: Math.floor(Date.now() / 1000),
          client_secret_expires_at: 0,
        };
        owner.store.put("client", client.client_id, client, 10 * 365 * 86400);
        return client;
      },
    };
  }
  private checkResource(resource?: URL) {
    if (resource && resource.href !== this.resource.href)
      throw new InvalidTargetError("Token must target this coffee tracker");
  }
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    response: Response,
  ) {
    this.checkResource(params.resource);
    const scopes = params.scopes?.length ? params.scopes : ["coffee"];
    if (
      !scopes.includes("coffee") ||
      scopes.some((s) => !scopesSupported.includes(s))
    )
      throw new InvalidScopeError("Unsupported scope");
    const id = randomToken();
    const pending: PendingAuthorization = {
      clientId: client.client_id,
      clientName: client.client_name || "MCP client",
      redirectUri: params.redirectUri,
      state: params.state,
      scopes,
      codeChallenge: params.codeChallenge,
      resource: this.resource.href,
    };
    this.owner.store.put("pending", hash(id), pending, 600);
    response.redirect(303, `/connect/${id}`);
  }
  pending(id: string) {
    return this.owner.store.get<PendingAuthorization>("pending", hash(id));
  }
  approve(id: string, allowed: boolean) {
    const pending = this.pending(id);
    if (!pending)
      throw new Error("Authorization expired. Start the connection again.");
    this.owner.store.remove("pending", hash(id));
    const redirect = new URL(pending.redirectUri);
    if (pending.state) redirect.searchParams.set("state", pending.state);
    if (allowed) {
      const code = randomToken();
      this.owner.store.put("code", hash(code), pending, 120);
      redirect.searchParams.set("code", code);
    } else redirect.searchParams.set("error", "access_denied");
    return redirect.href;
  }
  private code(client: OAuthClientInformationFull, code: string) {
    const value = this.owner.store.get<Code>("code", hash(code));
    if (!value || value.clientId !== client.client_id)
      throw new InvalidGrantError("Invalid or expired code");
    return value;
  }
  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    code: string,
  ) {
    return this.code(client, code).codeChallenge;
  }
  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    code: string,
    _verifier?: string,
    redirectUri?: string,
    resource?: URL,
  ): Promise<OAuthTokens> {
    const value = this.code(client, code);
    this.checkResource(resource);
    if (redirectUri !== value.redirectUri)
      throw new InvalidGrantError("Redirect URI mismatch");
    this.owner.store.remove("code", hash(code));
    const grantId = randomToken();
    this.owner.store.put(
      "grant",
      grantId,
      { fingerprint: this.owner.fingerprint },
      90 * 86400,
    );
    return this.issue({
      clientId: client.client_id,
      scopes: value.scopes,
      resource: value.resource,
      grantId,
    });
  }
  private issue(grant: Grant): OAuthTokens {
    const access = randomToken();
    this.owner.store.put(
      "access",
      hash(access),
      { ...grant, expiresAt: Math.floor(Date.now() / 1000) + 3600 },
      3600,
    );
    const refresh = randomToken();
    this.owner.store.put("refresh", hash(refresh), grant, 90 * 86400);
    return {
      access_token: access,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: refresh,
      scope: grant.scopes.join(" "),
    };
  }
  private grantValid(grantId: string) {
    return (
      this.owner.store.get<{ fingerprint: string }>("grant", grantId)
        ?.fingerprint === this.owner.fingerprint
    );
  }
  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refresh: string,
    scopes?: string[],
    resource?: URL,
  ): Promise<OAuthTokens> {
    const value = this.owner.store.get<Grant>("refresh", hash(refresh));
    if (
      !value ||
      value.clientId !== client.client_id ||
      !this.grantValid(value.grantId)
    )
      throw new InvalidGrantError("Invalid or expired refresh token");
    this.checkResource(resource);
    if (
      scopes &&
      (scopes.some((s) => !value.scopes.includes(s)) ||
        !scopes.includes("coffee"))
    )
      throw new InvalidScopeError("Cannot expand scopes");
    this.owner.store.remove("refresh", hash(refresh));
    return this.issue({ ...value, scopes: scopes || value.scopes });
  }
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const value = this.owner.store.get<Token>("access", hash(token));
    if (!value || !this.grantValid(value.grantId))
      throw new InvalidTokenError("Invalid or expired token");
    return {
      token,
      clientId: value.clientId,
      scopes: value.scopes,
      expiresAt: value.expiresAt,
      resource: new URL(value.resource),
    };
  }
  async revokeToken(
    client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ) {
    const key = hash(request.token);
    const value =
      this.owner.store.get<Grant>("access", key) ||
      this.owner.store.get<Grant>("refresh", key);
    if (value?.clientId === client.client_id)
      this.owner.store.remove("grant", value.grantId);
  }
  revokeAll() {
    for (const namespace of ["grant", "access", "refresh", "code", "pending"])
      this.owner.store.clear(namespace);
  }
}
