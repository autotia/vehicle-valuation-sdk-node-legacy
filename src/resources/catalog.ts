import type {
  AuthenticationError,
  AutotiaConnectionError,
  BadRequestError,
  InternalServerError,
  NotFoundError,
  RateLimitError,
} from "../core/errors";
import { type RequestConfig, requestData } from "../core/request";
import type { CallOptions } from "../core/types";
import type {
  CatalogMarks,
  CatalogModels,
  CatalogTrims,
  CatalogYears,
  MarkInferenceRequest,
  MarkInferenceResult,
  ModelInferenceRequest,
  ModelInferenceResult,
  TrimInferenceRequest,
  TrimInferenceResult,
  VehicleResolutionRequest,
  VehicleResolutionResult,
} from "./types";

/**
 * Recurso para explorar el catálogo oficial de vehículos e inferir marcas, modelos y versiones.
 */
export class CatalogResource {
  private readonly config: RequestConfig;

  public constructor(config: RequestConfig) {
    this.config = config;
  }

  /**
   * Lista las marcas de vehículos disponibles en el catálogo.
   *
   * @param options Opciones de llamada HTTP (soporta encabezado ifNoneMatch para caching 304).
   * @returns Promesa con las marcas del catálogo o null ante respuesta HTTP 304 Not Modified.
   * @throws {AuthenticationError} Si las credenciales son inválidas (HTTP 401).
   * @throws {RateLimitError} Si se supera el límite de llamadas por segundo (HTTP 429).
   * @throws {InternalServerError} Si el servicio de catálogo no responde temporalmente (HTTP 500, 503).
   * @throws {AutotiaConnectionError} Si ocurre una falla de red.
   *
   * @example
   * ```js
   * const marks = await client.catalog.listMarks();
   * if (marks) {
   *   console.log(`Marcas disponibles (${marks.marks.length}):`, marks.marks.map((m) => m.text));
   * }
   * ```
   */
  public listMarks(options: CallOptions = {}): Promise<CatalogMarks | null> {
    return requestData<CatalogMarks | null>(
      this.config,
      "GET",
      "/v1/catalog",
      undefined,
      options,
    );
  }

  /**
   * Lista los modelos disponibles para una marca en el catálogo.
   *
   * @param mark Clave canónica de la marca (por ejemplo 'toyota').
   * @param options Opciones de llamada HTTP (soporta ifNoneMatch).
   * @returns Promesa con los modelos de la marca o null ante respuesta HTTP 304 Not Modified.
   * @throws {NotFoundError} Si la marca especificada no existe en el catálogo (HTTP 404).
   * @throws {AuthenticationError} Si la autenticación falla (HTTP 401).
   * @throws {RateLimitError} Si se excede la tasa de llamadas (HTTP 429).
   * @throws {InternalServerError} Si el servidor falla temporalmente (HTTP 500, 503).
   * @throws {AutotiaConnectionError} Si se produce una falla de red.
   *
   * @example
   * ```js
   * const models = await client.catalog.listModels("toyota");
   * if (models) {
   *   console.log(`Modelos Toyota:`, models.models.map((m) => m.text));
   * }
   * ```
   */
  public listModels(
    mark: string,
    options: CallOptions = {},
  ): Promise<CatalogModels | null> {
    return requestData<CatalogModels | null>(
      this.config,
      "GET",
      `/v1/catalog/${encodeURIComponent(mark)}`,
      undefined,
      options,
    );
  }

  /**
   * Lista los años de fabricación registrados para un modelo en el catálogo.
   *
   * @param mark Clave canónica de la marca (por ejemplo 'toyota').
   * @param model Clave canónica del modelo (por ejemplo 'yaris').
   * @param options Opciones de llamada HTTP (soporta ifNoneMatch).
   * @returns Promesa con los años disponibles o null ante respuesta HTTP 304 Not Modified.
   * @throws {NotFoundError} Si la marca o el modelo no existen (HTTP 404).
   * @throws {AuthenticationError} Si la autenticación falla (HTTP 401).
   * @throws {RateLimitError} Si se excede la tasa de consultas (HTTP 429).
   * @throws {InternalServerError} Si el servicio no responde temporalmente.
   * @throws {AutotiaConnectionError} Si ocurre una falla de red.
   *
   * @example
   * ```js
   * const years = await client.catalog.listYears("toyota", "yaris");
   * if (years) {
   *   console.log("Años disponibles Yaris:", years.years);
   * }
   * ```
   */
  public listYears(
    mark: string,
    model: string,
    options: CallOptions = {},
  ): Promise<CatalogYears | null> {
    return requestData<CatalogYears | null>(
      this.config,
      "GET",
      `/v1/catalog/${encodeURIComponent(mark)}/${encodeURIComponent(model)}`,
      undefined,
      options,
    );
  }

  /**
   * Lista las versiones disponibles para un modelo y año de fabricación específico.
   *
   * @param mark Clave canónica de la marca (por ejemplo 'toyota').
   * @param model Clave canónica del modelo (por ejemplo 'yaris').
   * @param year Año de fabricación (por ejemplo 2020).
   * @param options Opciones de llamada HTTP (soporta ifNoneMatch).
   * @returns Promesa con las versiones del catálogo o null ante respuesta HTTP 304 Not Modified.
   * @throws {NotFoundError} Si la combinación de marca, modelo y año no existe (HTTP 404).
   * @throws {AuthenticationError} Si la autenticación falla (HTTP 401).
   * @throws {RateLimitError} Si se excede la tasa de peticiones (HTTP 429).
   * @throws {InternalServerError} Si el servidor falla (HTTP 500, 503).
   * @throws {AutotiaConnectionError} Si ocurre una desconexión de red.
   *
   * @example
   * ```js
   * const trims = await client.catalog.listTrims("toyota", "yaris", 2020);
   * if (trims) {
   *   console.log("Versiones Yaris 2020:", trims.trims.map((t) => t.text));
   * }
   * ```
   */
  public listTrims(
    mark: string,
    model: string,
    year: number,
    options: CallOptions = {},
  ): Promise<CatalogTrims | null> {
    return requestData<CatalogTrims | null>(
      this.config,
      "GET",
      `/v1/catalog/${encodeURIComponent(mark)}/${encodeURIComponent(model)}/${encodeURIComponent(String(year))}`,
      undefined,
      options,
    );
  }

  /**
   * Infiere versiones de catálogo compatibles a partir de marca, modelo, año y texto libre.
   *
   * @param input Parámetros de inferencia que incluyen marca, modelo, año y texto libre descriptivo.
   * @param options Opciones de llamada HTTP.
   * @returns Promesa con el resultado de inferencia ('matched', 'no_evidence', 'no_match') y versiones ordenadas.
   * @throws {BadRequestError} Si los parámetros de solicitud son inválidos (HTTP 400).
   * @throws {NotFoundError} Si no se encuentra el año para el modelo con código year_not_found (HTTP 404).
   * @throws {AuthenticationError} Si las credenciales son inválidas (HTTP 401).
   * @throws {RateLimitError} Si se excede la tasa de llamadas (HTTP 429).
   * @throws {InternalServerError} Si el servicio de inferencia falla (HTTP 500, 503).
   * @throws {AutotiaConnectionError} Si ocurre un error de conexión de red.
   *
   * @example
   * ```js
   * const inference = await client.catalog.inferTrim({
   *   mark: "Peugeot",
   *   model: "208",
   *   year: 2021,
   *   text: "1.2 PureTech Allure 5p",
   * });
   * const candidate = inference.versions[0] ? inference.versions[0].version : "ninguno";
   * console.log(`Resultado: ${inference.outcome}, Candidato: ${candidate}`);
   * ```
   */
  public inferTrim(
    input: TrimInferenceRequest,
    options: CallOptions = {},
  ): Promise<TrimInferenceResult> {
    const body: Record<string, unknown> = {
      mark: input.mark,
      model: input.model,
      year: input.year,
      text: input.text,
    };
    if (input.limit !== undefined) {
      body.limit = input.limit;
    }
    return requestData<TrimInferenceResult>(
      this.config,
      "POST",
      "/v1/version-inference",
      body,
      options,
    );
  }

  /**
   * Resuelve y normaliza el vehículo en el catálogo antes de crear un pedido de tasación.
   *
   * @param input Datos del vehículo para identificación exacta (model + version) o flexible (search).
   * @param options Opciones de llamada HTTP.
   * @returns Promesa con el vehículo normalizado y los metadatos de resolución.
   * @throws {BadRequestError} Si los parámetros de resolución son inconsistentes (HTTP 400).
   * @throws {NotFoundError} Si el vehículo no puede resolverse en el catálogo (HTTP 404).
   * @throws {AuthenticationError} Si las credenciales son inválidas (HTTP 401).
   * @throws {RateLimitError} Si se supera el límite de peticiones (HTTP 429).
   * @throws {InternalServerError} Si el servicio de resolución falla (HTTP 500, 503).
   * @throws {AutotiaConnectionError} Si ocurre una falla de red.
   *
   * @example
   * ```js
   * const resolved = await client.catalog.resolveVehicle({
   *   mark: "Toyota",
   *   year: 2020,
   *   search: "Yaris 1.5 sedan",
   * });
   * console.log(`Resuelto como ${resolved.model} ${resolved.version} (certeza: ${resolved.resolution.certainty})`);
   * ```
   */
  public resolveVehicle(
    input: VehicleResolutionRequest,
    options: CallOptions = {},
  ): Promise<VehicleResolutionResult> {
    return requestData<VehicleResolutionResult>(
      this.config,
      "POST",
      "/v1/vehicle-resolution",
      input,
      options,
    );
  }

  /**
   * Infiere la marca del vehículo a partir de un texto libre o búsqueda parcial.
   *
   * @param input Objeto con el texto libre de búsqueda y límite opcional.
   * @param options Opciones de llamada HTTP.
   * @returns Promesa con las marcas candidatas sugeridas ordenadas por confianza.
   * @throws {BadRequestError} Si el texto está vacío o es inválido (HTTP 400).
   * @throws {AuthenticationError} Si las credenciales son inválidas (HTTP 401).
   * @throws {RateLimitError} Si se excede la tasa de consultas (HTTP 429).
   * @throws {InternalServerError} Si el motor de inferencia falla (HTTP 500, 503).
   * @throws {AutotiaConnectionError} Si ocurre un error de red.
   *
   * @example
   * ```js
   * const result = await client.catalog.inferMark({ text: "toyot" });
   * const mark = result.marks[0] ? result.marks[0].name : "ninguna";
   * console.log("Marca sugerida:", mark);
   * ```
   */
  public inferMark(
    input: MarkInferenceRequest,
    options: CallOptions = {},
  ): Promise<MarkInferenceResult> {
    return requestData<MarkInferenceResult>(
      this.config,
      "POST",
      "/v1/mark-inference",
      input,
      options,
    );
  }

  /**
   * Infiere el modelo del vehículo a partir de marca, año y texto libre.
   *
   * @param input Parámetros que contienen marca, año, texto libre del modelo y límite opcional.
   * @param options Opciones de llamada HTTP.
   * @returns Promesa con los modelos sugeridos ordenados por afinidad y confianza.
   * @throws {BadRequestError} Si los parámetros son inválidos (HTTP 400).
   * @throws {NotFoundError} Si la marca no existe en el catálogo (HTTP 404).
   * @throws {AuthenticationError} Si las credenciales son inválidas (HTTP 401).
   * @throws {RateLimitError} Si se supera el límite de llamadas (HTTP 429).
   * @throws {InternalServerError} Si el servicio de inferencia no responde (HTTP 500, 503).
   * @throws {AutotiaConnectionError} Si se produce una desconexión de red.
   *
   * @example
   * ```js
   * const result = await client.catalog.inferModel({
   *   mark: "Toyota",
   *   year: 2020,
   *   text: "yari",
   * });
   * const model = result.models[0] ? result.models[0].name : "ninguno";
   * console.log("Modelo sugerido:", model);
   * ```
   */
  public inferModel(
    input: ModelInferenceRequest,
    options: CallOptions = {},
  ): Promise<ModelInferenceResult> {
    return requestData<ModelInferenceResult>(
      this.config,
      "POST",
      "/v1/model-inference",
      input,
      options,
    );
  }
}
