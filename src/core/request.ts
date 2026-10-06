import type { TokenProvider } from "../auth/token-provider";
import {
  AuthenticationError,
  AutotiaConnectionError,
  AutotiaError,
  makeHttpError,
} from "./errors";
import { getRetrySettings, isTransient, retryDelay } from "./retry";
import type { CallOptions, Envelope, HttpMethod, Transport } from "./types";

export interface RequestConfig {
  baseUrl: string;
  transport: Transport;
  tokenProvider: TokenProvider;
  maxRetries: number;
  timeoutMs: number;
}

export async function requestData<T>(
  config: RequestConfig,
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: CallOptions = {},
): Promise<T> {
  const started = Date.now();
  const timeout =
    options.timeoutMs === undefined ? config.timeoutMs : options.timeoutMs;
  const retry = getRetrySettings(options, config.maxRetries);
  let retries = 0;
  let authRefreshes = 0;
  const serialized = body === undefined ? undefined : JSON.stringify(body);

  while (true) {
    if (options.signal && options.signal.aborted)
      throw new AutotiaConnectionError("La solicitud fue cancelada.");
    if (Date.now() - started >= timeout)
      throw new AutotiaConnectionError("La llamada superó su plazo total.");
    const token = await config.tokenProvider.getToken();
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (serialized !== undefined) headers["Content-Type"] = "application/json";
    if (options.idempotencyKey)
      headers["Idempotency-Key"] = options.idempotencyKey;
    if (options.ifNoneMatch) headers["If-None-Match"] = options.ifNoneMatch;
    try {
      const response = await config.transport.request({
        method: method,
        url: joinUrl(config.baseUrl, path),
        headers: headers,
        body: serialized,
        timeoutMs: Math.max(
          1,
          Math.min(timeout, timeout - (Date.now() - started)),
        ),
        signal: options.signal,
      });
      if (response.status === 304) return null as T;
      const envelope = parseEnvelope(response.body);
      if (response.status === 401 && authRefreshes < 1) {
        authRefreshes += 1;
        if (config.tokenProvider.invalidate) config.tokenProvider.invalidate();
        continue;
      }
      if (response.status < 200 || response.status >= 300)
        throw makeHttpError(response.status, envelope);
      if (
        !envelope ||
        !Object.prototype.hasOwnProperty.call(envelope, "data")
      ) {
        throw new AutotiaError("La API devolvió un envelope no válido.", {
          status: response.status,
        });
      }
      if (envelope.error) throw makeHttpError(response.status, envelope);
      return envelope.data as T;
    } catch (error) {
      const sdkError = asSdkError(error);
      if (!isTransient(sdkError) || retries >= retry.maxRetries) throw sdkError;
      const delay = retryDelay(retries, retry.baseDelayMs, retry.maxDelayMs);
      retries += 1;
      const remaining = timeout - (Date.now() - started);
      if (remaining <= delay)
        throw new AutotiaConnectionError("La llamada superó su plazo total.", {
          cause: sdkError,
        });
      await wait(delay, options.signal);
    }
  }
}

function parseEnvelope(body: string): Envelope<unknown> | undefined {
  if (!body) return undefined;
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed && typeof parsed === "object"
      ? (parsed as Envelope<unknown>)
      : undefined;
  } catch (_error) {
    return undefined;
  }
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function asSdkError(error: unknown): AutotiaError {
  if (error instanceof AutotiaError) return error;
  if (error instanceof Error)
    return new AutotiaConnectionError("Falló la comunicación con la API.", {
      cause: error,
    });
  return new AutotiaConnectionError("Falló la comunicación con la API.");
}

function wait(ms: number, signal?: CallOptions["signal"]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) {
      reject(new AutotiaConnectionError("La solicitud fue cancelada."));
      return;
    }
    const timer = setTimeout(() => {
      if (signal && signal.removeEventListener)
        signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new AutotiaConnectionError("La solicitud fue cancelada."));
    };
    if (signal) signal.addEventListener("abort", onAbort);
  });
}

export function isAuthenticationError(
  error: unknown,
): error is AuthenticationError {
  return error instanceof AuthenticationError;
}
