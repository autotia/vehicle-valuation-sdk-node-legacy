import { OrderFailedError, WaiterTimeoutError } from "../core/errors";
import { type RequestConfig, requestData } from "../core/request";
import type { CallOptions } from "../core/types";
import type { OrderAcceptance, OrderRequest, OrderStatus } from "./types";

export class OrdersResource {
  private readonly config: RequestConfig;
  private readonly pollIntervals: { [orderId: string]: number };

  public constructor(config: RequestConfig) {
    this.config = config;
    this.pollIntervals = Object.create(null) as {
      [orderId: string]: number;
    };
  }

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

  public get(orderId: string, options: CallOptions = {}): Promise<OrderStatus> {
    return requestData(
      this.config,
      "GET",
      `/v1/orders/${encodeURIComponent(orderId)}`,
      undefined,
      options,
    );
  }

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
