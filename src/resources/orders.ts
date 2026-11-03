import {
  OrderFailedError,
  TrimInferenceError,
  WaiterTimeoutError,
} from "../core/errors";
import { type RequestConfig, requestData } from "../core/request";
import type { CallOptions } from "../core/types";
import { CatalogResource } from "./catalog";
import type {
  OrderAcceptance,
  OrderFromTrimTextOptions,
  OrderFromTrimTextRequest,
  OrderFromTrimTextResult,
  OrderRequest,
  OrderStatus,
} from "./types";

/**
 * Recurso para la creación, consulta y sondeo de pedidos de tasación vehicular.
 */
export class OrdersResource {
  private readonly config: RequestConfig;
  private readonly catalog: CatalogResource;
  private readonly pollIntervals: { [orderId: string]: number };

  public constructor(config: RequestConfig) {
    this.config = config;
    this.catalog = new CatalogResource(config);
    this.pollIntervals = Object.create(null) as {
      [orderId: string]: number;
    };
  }

  /**
   * Solicita la creación asíncrona de un pedido de tasación vehicular entregando identificación exacta o por búsqueda.
   *
   * @param input Parámetros del pedido incluyendo tipo de informe, marca, año y modelo/versión o búsqueda libre.
   * @param options Opciones de llamada HTTP (idempotencia, señal de cancelación, timeout).
   * @returns Promesa con la respuesta de aceptación (HTTP 202 con pollAfterMs) o el estado del pedido.
   * @throws {BadRequestError} Si los parámetros de solicitud son inválidos (HTTP 400).
   * @throws {AuthenticationError} Si las credenciales son inválidas o el token expiró (HTTP 401).
   * @throws {PermissionDeniedError} Si el cliente no tiene autorización o fue suspendido (HTTP 403).
   * @throws {ConflictError} Si existe un conflicto con la clave de idempotencia enviada (HTTP 409).
   * @throws {QuotaExceededError} Si se agotó la cuota mensual o el saldo contratado (HTTP 429).
   * @throws {RateLimitError} Si se excedió la tasa máxima de llamadas por segundo (HTTP 429).
   * @throws {InternalServerError} Si ocurre un error temporal en el servicio upstream (HTTP 500, 502, 503, 504).
   * @throws {AutotiaConnectionError} Si se produce una falla de red o conexión al servidor.
   *
   * @example
   * ```js
   * const acceptance = await client.orders.create({
   *   reportType: "general-price",
   *   mark: "Toyota",
   *   model: "Yaris",
   *   year: 2020,
   *   version: "1.5 GL",
   *   odometerKm: 45000,
   *   region: "CL-RM",
   * });
   * console.log(`Pedido creado: ${acceptance.orderId}`);
   * ```
   */
  public async create(
    input: OrderRequest,
    options: CallOptions = {},
  ): Promise<OrderAcceptance | OrderStatus> {
    const headersOptions = options.idempotencyKey
      ? options
      : { ...options, idempotencyKey: createUuid() };
    const response = await requestData<OrderAcceptance | OrderStatus>(
      this.config,
      "POST",
      "/v1/orders",
      input,
      headersOptions,
    );
    if ("pollAfterMs" in response && typeof response.pollAfterMs === "number") {
      this.pollIntervals[response.orderId] = response.pollAfterMs;
    }
    return response;
  }

  /**
   * Infiere la versión de catálogo a partir de un texto libre y solicita inmediatamente la tasación vehicular.
   *
   * @param input Datos del vehículo y texto libre descriptivo de la versión.
   * @param options Opciones de llamada y umbral mínimo de preferencia (minConfidence).
   * @returns Promesa con el resultado de la inferencia, la versión seleccionada y el pedido creado.
   * @throws {TrimInferenceError} Si el texto no aporta evidencia suficiente, no coincide con el catálogo o no alcanza minConfidence.
   * @throws {BadRequestError} Si los parámetros de solicitud son inválidos (HTTP 400).
   * @throws {AuthenticationError} Si las credenciales son inválidas o el token expiró (HTTP 401).
   * @throws {PermissionDeniedError} Si el cliente no tiene autorización (HTTP 403).
   * @throws {QuotaExceededError} Si se agotó la cuota comercial contratada (HTTP 429).
   * @throws {RateLimitError} Si se excedió la tasa de peticiones concurrentes (HTTP 429).
   * @throws {InternalServerError} Si el servicio de inferencia o pedidos falla temporalmente.
   * @throws {AutotiaConnectionError} Si ocurre una falla de red.
   *
   * @example
   * ```js
   * const { order, selectedVersion, inference } = await client.orders.createFromTrimText(
   *   {
   *     reportType: "general-price",
   *     mark: "Peugeot",
   *     model: "208",
   *     year: 2021,
   *     trimText: "1.2 PureTech Allure 5p",
   *     odometerKm: 38000,
   *     region: "CL-RM",
   *   },
   *   { minConfidence: 70 },
   * );
   * console.log(`Versión elegida: ${selectedVersion}`);
   * ```
   */
  public async createFromTrimText(
    input: OrderFromTrimTextRequest,
    options: OrderFromTrimTextOptions = {},
  ): Promise<OrderFromTrimTextResult> {
    const inferenceOptions: CallOptions = {
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    };
    const inference = await this.catalog.inferTrim(
      {
        mark: input.mark,
        model: input.model,
        year: input.year,
        text: input.trimText,
        limit: input.limit,
      },
      inferenceOptions,
    );

    const versions = inference && inference.versions ? inference.versions : [];

    if (inference.outcome === "no_evidence") {
      throw new TrimInferenceError(
        "El texto no aporta evidencia suficiente para determinar una versión.",
        inference.outcome,
        versions,
      );
    }

    if (inference.outcome === "no_match") {
      throw new TrimInferenceError(
        "El texto no coincide con ninguna versión del catálogo para el año indicado.",
        inference.outcome,
        versions,
      );
    }

    const firstCandidate = versions[0];
    if (
      inference.outcome !== "matched" ||
      versions.length === 0 ||
      !firstCandidate
    ) {
      throw new TrimInferenceError(
        `No fue posible determinar una versión compatible (resultado: ${inference.outcome}).`,
        inference.outcome,
        versions,
      );
    }

    if (
      options.minConfidence !== undefined &&
      firstCandidate.confidence < options.minConfidence
    ) {
      throw new TrimInferenceError(
        `La confianza del candidato principal (${firstCandidate.confidence}) es inferior al umbral mínimo requerido (${options.minConfidence}).`,
        inference.outcome,
        versions,
      );
    }

    const selectedVersion = firstCandidate.version;

    const orderOptions: CallOptions = {
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
      timeoutMs: options.timeoutMs,
      pollAfterMs: options.pollAfterMs,
    };

    const orderRequest: OrderRequest = {
      reportType: input.reportType,
      mark: input.mark,
      model: input.model,
      year: input.year,
      version: selectedVersion,
      ...(input.odometerKm !== undefined
        ? { odometerKm: input.odometerKm }
        : {}),
    };

    const order = await this.create(orderRequest, orderOptions);

    return {
      order: order,
      inference: inference,
      selectedVersion: selectedVersion,
    };
  }

  /**
   * Consulta el estado de procesamiento de un pedido de tasación vehicular existente.
   *
   * @param orderId Identificador único del pedido en formato 'ordb2b_…'.
   * @param options Opciones de llamada HTTP (señal de cancelación, timeout).
   * @returns Promesa con el estado del pedido, incluyendo el resultado si ya finalizó (COMPLETED).
   * @throws {BadRequestError} Si el formato del identificador de pedido es inválido (HTTP 400).
   * @throws {AuthenticationError} Si el token de acceso es inválido o ha expirado (HTTP 401).
   * @throws {PermissionDeniedError} Si el pedido no pertenece a la cuenta autenticada (HTTP 403).
   * @throws {NotFoundError} Si no se encuentra el pedido especificado (HTTP 404).
   * @throws {RateLimitError} Si se excedió el límite de peticiones por segundo (HTTP 429).
   * @throws {InternalServerError} Si el servicio no responde temporalmente (HTTP 500, 503, 504).
   * @throws {AutotiaConnectionError} Si ocurre un error de red.
   *
   * @example
   * ```js
   * const status = await client.orders.get("ordb2b_01j7x000000000000000000000");
   * if (status.status === "COMPLETED" && status.result) {
   *   console.log("Tasación lista:", status.result.data);
   * }
   * ```
   */
  public async get(
    orderId: string,
    options: CallOptions = {},
  ): Promise<OrderStatus> {
    const status = await requestData<OrderStatus>(
      this.config,
      "GET",
      `/v1/orders/${encodeURIComponent(orderId)}`,
      undefined,
      options,
    );
    if (typeof status.pollAfterMs === "number")
      this.pollIntervals[orderId] = status.pollAfterMs;
    return status;
  }

  /**
   * Realiza polling periódico sobre un pedido hasta que alcance el estado terminal COMPLETED o FAILED, o venza el plazo.
   *
   * @param orderId Identificador único del pedido en formato 'ordb2b_…'.
   * @param options Opciones de polling (timeoutMs, pollAfterMs, signal).
   * @returns Promesa con el estado completado del pedido que contiene el resultado (result).
   * @throws {OrderFailedError} Si la tasación finaliza con estado FAILED.
   * @throws {WaiterTimeoutError} Si se supera el tiempo máximo de espera o la señal es cancelada.
   * @throws {BadRequestError} Si el identificador del pedido es inválido (HTTP 400).
   * @throws {AuthenticationError} Si la autenticación falla durante el sondeo (HTTP 401).
   * @throws {PermissionDeniedError} Si el pedido no pertenece al cliente (HTTP 403).
   * @throws {NotFoundError} Si el pedido no existe en el sistema (HTTP 404).
   * @throws {QuotaExceededError} Si se agota la cuota durante las consultas (HTTP 429).
   * @throws {RateLimitError} Si se excede la tasa de consultas por segundo (HTTP 429).
   * @throws {InternalServerError} Si el servicio falla de forma sostenida (HTTP 500, 503).
   * @throws {AutotiaConnectionError} Si se pierde la conexión de red durante el polling.
   *
   * @example
   * ```js
   * const order = await client.orders.waitUntilComplete("ordb2b_01j7x000000000000000000000", {
   *   timeoutMs: 60000,
   * });
   * console.log("Resultado completado:", order.result && order.result.data);
   * ```
   */
  public async waitUntilComplete(
    orderId: string,
    options: CallOptions = {},
  ): Promise<OrderStatus> {
    const timeout =
      options.timeoutMs === undefined ? 120000 : options.timeoutMs;
    const started = Date.now();
    let delay =
      options.pollAfterMs !== undefined
        ? options.pollAfterMs
        : this.pollIntervals[orderId] !== undefined
          ? this.pollIntervals[orderId]
          : 2000;
    while (Date.now() - started < timeout) {
      if (options.signal && options.signal.aborted)
        throw new WaiterTimeoutError("La espera fue cancelada.");
      const remaining = timeout - (Date.now() - started);
      const status = await this.get(orderId, {
        ...options,
        timeoutMs: Math.max(1, remaining),
      });
      if (status.status === "FAILED") {
        delete this.pollIntervals[orderId];
        const failure = status.failure || {
          code: "service_unavailable",
          description: "El pedido terminó sin resultado.",
        };
        throw new OrderFailedError(failure.description, {
          code: failure.code,
        });
      }
      if (status.status === "COMPLETED" && status.result) {
        delete this.pollIntervals[orderId];
        return status;
      }
      const waitMs = Math.min(
        delay,
        Math.max(0, timeout - (Date.now() - started)),
      );
      if (waitMs <= 0) break;
      await waitFor(waitMs, options.signal);
      delay = options.pollAfterMs === undefined ? delay : options.pollAfterMs;
    }
    delete this.pollIntervals[orderId];
    throw new WaiterTimeoutError("La espera superó el plazo configurado.");
  }
}

function createUuid(): string {
  const bytes = require("crypto").randomBytes(16) as Buffer;
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function waitFor(ms: number, signal?: CallOptions["signal"]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) {
      reject(new WaiterTimeoutError("La espera fue cancelada."));
      return;
    }
    const timer = setTimeout(() => {
      if (signal && signal.removeEventListener)
        signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new WaiterTimeoutError("La espera fue cancelada."));
    };
    if (signal) signal.addEventListener("abort", onAbort);
  });
}
