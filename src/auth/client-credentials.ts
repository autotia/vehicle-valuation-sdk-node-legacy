import { URLSearchParams } from "url";
import { AuthenticationError, AutotiaConnectionError } from "../core/errors";
import type { Transport, TransportResponse } from "../core/types";
import type { TokenProvider } from "./token-provider";

export class ClientCredentialsTokenProvider implements TokenProvider {
  private token?: string;
  private expiresAt = 0;
  private pending?: Promise<string>;
  private readonly transport: Transport;
  private readonly tokenUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly scopes?: string[];

  public constructor(
    transport: Transport,
    tokenUrl: string,
    clientId: string,
    clientSecret: string,
    scopes?: string[],
  ) {
    this.transport = transport;
    this.tokenUrl = tokenUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.scopes = scopes;
  }

  public getToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.token && Date.now() < this.expiresAt)
      return Promise.resolve(this.token);
    if (this.pending) return this.pending;
    const promise = this.fetchToken();
    this.pending = promise;
    promise.then(
      () => {
        if (this.pending === promise) this.pending = undefined;
      },
      () => {
        if (this.pending === promise) this.pending = undefined;
      },
    );
    return promise;
  }

  public invalidate(): void {
    this.token = undefined;
    this.expiresAt = 0;
  }

  private async fetchToken(): Promise<string> {
    const form = new URLSearchParams();
    form.set("grant_type", "client_credentials");
    if (this.scopes && this.scopes.length > 0)
      form.set("scope", this.scopes.join(" "));
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64",
    );
    let response: TransportResponse;
    try {
      response = await this.transport.request({
        method: "POST",
        url: this.tokenUrl,
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: form.toString(),
        timeoutMs: 10000,
      });
    } catch (error) {
      if (error instanceof AutotiaConnectionError) throw error;
      throw new AutotiaConnectionError(
        "No se pudo conectar con el servicio de autenticación.",
        { cause: error },
      );
    }
    let payload: unknown;
    try {
      payload = JSON.parse(response.body) as unknown;
    } catch (error) {
      throw new AuthenticationError(
        "El servicio de autenticación devolvió una respuesta no válida.",
        { status: response.status, cause: error },
      );
    }
    if (
      response.status < 200 ||
      response.status >= 300 ||
      !isTokenPayload(payload)
    ) {
      throw new AuthenticationError("No se pudo obtener un token de acceso.", {
        status: response.status,
      });
    }
    const ttl =
      typeof payload.expires_in === "number" && payload.expires_in > 0
        ? payload.expires_in
        : 300;
    const accessToken = payload.access_token;
    this.token = accessToken;
    this.expiresAt = Date.now() + Math.max(0, ttl * 1000 - 60000);
    if (this.expiresAt <= Date.now())
      this.expiresAt = Date.now() + Math.floor(ttl * 1000 * 0.8);
    return accessToken;
  }
}

function isTokenPayload(
  value: unknown,
): value is { access_token: string; expires_in?: unknown } {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { access_token?: unknown }).access_token === "string",
  );
}
