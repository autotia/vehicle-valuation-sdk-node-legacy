import type { CallOptions } from "./types";

export interface RetrySettings {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export function getRetrySettings(
  options?: CallOptions,
  clientMaxRetries = 2,
): RetrySettings {
  return {
    maxRetries:
      options && options.maxRetries !== undefined
        ? options.maxRetries
        : clientMaxRetries,
    baseDelayMs: 100,
    maxDelayMs: 10000,
  };
}

export function retryDelay(
  retryNumber: number,
  baseDelayMs: number,
  maxDelayMs: number,
  random = Math.random,
): number {
  const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** retryNumber);
  return Math.floor(random() * (ceiling + 1));
}

export function isTransient(error: Error): boolean {
  const name = error.name;
  return (
    name === "RateLimitError" ||
    name === "InternalServerError" ||
    name === "AutotiaConnectionError"
  );
}
