import { ClientCredentialsTokenProvider } from "./auth/client-credentials";
import type { TokenProvider } from "./auth/token-provider";
import type { RequestConfig } from "./core/request";
import type { Transport } from "./core/types";
import { CatalogResource } from "./resources/catalog";
import { OrdersResource } from "./resources/orders";
import { HttpsTransport } from "./transport/https";

export {
  AutotiaConnectionError,
  AutotiaError,
  AuthenticationError,
  BadRequestError,
  ConflictError,
  InternalServerError,
  NotFoundError,
  OrderFailedError,
  PermissionDeniedError,
  QuotaExceededError,
  RateLimitError,
  TrimInferenceError,
  UnprocessableEntityError,
  WaiterTimeoutError,
  ErrorDetails,
} from "./core/errors";
export * from "./core/types";
export * from "./resources/types";
export { TokenProvider } from "./auth/token-provider";
export { OrdersResource } from "./resources/orders";
export { CatalogResource } from "./resources/catalog";

/**
 * Opciones de configuración para inicializar el cliente VehicleValuationClient.
 */
export interface VehicleValuationClientOptions {
  /** Entorno predefinido ('dev' para desarrollo, 'prod' para producción). */
  environment?: "dev" | "prod";
  /** URL base personalizada de la API B2B (requiere tokenUrl si no se usa environment). */
  baseUrl?: string;
  /** URL del endpoint OAuth2 token (requiere baseUrl si no se usa environment). */
  tokenUrl?: string;
  /** Identificador de cliente OAuth2 (clientId). */
  clientId?: string;
  /** Secreto de cliente OAuth2 (clientSecret). Solo debe utilizarse en entornos seguros de backend. */
  clientSecret?: string;
  /** Scopes opcionales a solicitar en la emisión del token. */
  scopes?: string[];
  /** Proveedor personalizado de token OAuth2 si la aplicación gestiona la autenticación de forma delegada. */
  tokenProvider?: TokenProvider;
  /** Tiempo de espera máximo por intento en milisegundos (por defecto 30000 ms). */
  timeoutMs?: number;
  /** Cantidad máxima de reintentos automáticos ante errores transitorios de red o 503 (por defecto 2). */
  maxRetries?: number;
  /** Transporte HTTP inyectable para pruebas o entornos personalizados. */
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

/**
 * Cliente oficial CommonJS para la API B2B de tasación vehicular de Autotia (Node.js 11.15 a 22.11).
 */
export class VehicleValuationClient {
  /**
   * Recurso para crear pedidos de tasación, consultar su estado y esperar su resultado mediante sondeo.
   */
  public readonly orders: OrdersResource;

  /**
   * Recurso para consultar marcas, modelos y versiones del catálogo vehicular e inferir especificaciones.
   */
  public readonly catalog: CatalogResource;

  /**
   * Inicializa una nueva instancia del cliente de tasación vehicular.
   *
   * @param options Opciones de configuración del cliente (ambiente, credenciales OAuth2, timeouts).
   * @throws {TypeError} Si no se entrega un ambiente válido o faltan las credenciales requeridas.
   *
   * @example
   * ```js
   * const { VehicleValuationClient } = require("@autotia/vehicle-valuation-sdk-legacy");
   *
   * const client = new VehicleValuationClient({
   *   environment: "prod",
   *   clientId: "mi-client-id",
   *   clientSecret: "mi-client-secret",
   * });
   * ```
   */
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
    this.orders = new OrdersResource(config);
    this.catalog = new CatalogResource(config);
  }
}
