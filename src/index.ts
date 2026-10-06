import { ClientCredentialsTokenProvider } from "./auth/client-credentials";
import type { TokenProvider } from "./auth/token-provider";
import type { RequestConfig } from "./core/request";
import type { Transport } from "./core/types";
import { CatalogResource } from "./resources/catalog";
import { ValuationsResource } from "./resources/valuations";
import { HttpsTransport } from "./transport/https";

export * from "./core/errors";
export * from "./core/types";
export * from "./resources/types";
export { TokenProvider } from "./auth/token-provider";

export interface VehicleValuationClientOptions {
  environment?: "dev" | "prod";
  baseUrl?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scopes?: string[];
  tokenProvider?: TokenProvider;
  timeoutMs?: number;
  maxRetries?: number;
  transport?: Transport;
}

const ENVIRONMENTS = {
  dev: {
    baseUrl: "https://api.dev.autotia.com/public-secure/shop-b2b",
    tokenUrl:
      "https://prdrpt-b2b-dev.auth.us-east-1.amazoncognito.com/oauth2/token",
  },
  // Pendiente de confirmar antes de publicar el preset.
  prod: {
    baseUrl: "https://api.autotia.com/public-secure/shop-b2b",
    tokenUrl:
      "https://prdrpt-b2b-prod.auth.us-east-1.amazoncognito.com/oauth2/token",
  },
};

export class VehicleValuationClient {
  public readonly valuations: ValuationsResource;
  public readonly catalog: CatalogResource;

  public constructor(options: VehicleValuationClientOptions) {
    if (
      !options ||
      (!options.environment && !(options.baseUrl && options.tokenUrl))
    ) {
      throw new TypeError(
        "Indica environment o proporciona baseUrl y tokenUrl.",
      );
    }
    const preset = options.environment
      ? ENVIRONMENTS[options.environment]
      : undefined;
    if (options.environment && !preset)
      throw new TypeError("environment debe ser dev o prod.");
    const baseUrl = options.baseUrl || (preset && preset.baseUrl);
    const tokenUrl = options.tokenUrl || (preset && preset.tokenUrl);
    if (!baseUrl || !tokenUrl)
      throw new TypeError("No se pudo determinar baseUrl y tokenUrl.");
    if (
      !options.tokenProvider &&
      (!options.clientId || !options.clientSecret)
    ) {
      throw new TypeError(
        "Se requieren clientId y clientSecret, o tokenProvider.",
      );
    }
    const transport = options.transport || new HttpsTransport();
    const tokenProvider =
      options.tokenProvider ||
      new ClientCredentialsTokenProvider(
        transport,
        tokenUrl,
        options.clientId as string,
        options.clientSecret as string,
        options.scopes,
      );
    const config: RequestConfig = {
      baseUrl: baseUrl,
      transport: transport,
      tokenProvider: tokenProvider,
      maxRetries: options.maxRetries === undefined ? 2 : options.maxRetries,
      timeoutMs: options.timeoutMs === undefined ? 30000 : options.timeoutMs,
    };
    this.valuations = new ValuationsResource(config);
    this.catalog = new CatalogResource(config);
  }
}
