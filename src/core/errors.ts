import type { InferredTrim } from "../resources/types";

export interface ErrorDetails {
  status?: number;
  code?: string;
  apiRequestId?: string;
  executionId?: string;
  cause?: unknown;
  retryAfter?: string;
}

export class AutotiaError extends Error {
  public status?: number;
  public code?: string;
  public apiRequestId?: string;
  public executionId?: string;
  public cause?: unknown;
  public retryAfter?: string;

  public constructor(message: string, details: ErrorDetails = {}) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.status = details.status;
    this.code = details.code;
    this.apiRequestId = details.apiRequestId;
    this.executionId = details.executionId;
    this.cause = details.cause;
    this.retryAfter = details.retryAfter;
  }
}

export class BadRequestError extends AutotiaError {}
export class AuthenticationError extends AutotiaError {}
export class PermissionDeniedError extends AutotiaError {}
export class NotFoundError extends AutotiaError {}
export class ConflictError extends AutotiaError {}
export class UnprocessableEntityError extends AutotiaError {}
export class QuotaExceededError extends AutotiaError {}
export class RateLimitError extends AutotiaError {}
export class InternalServerError extends AutotiaError {}
export class AutotiaConnectionError extends AutotiaError {}
export class WaiterTimeoutError extends AutotiaError {}
export class OrderFailedError extends AutotiaError {}
export class TrimInferenceError extends AutotiaError {
  public outcome: string;
  public versions: InferredTrim[];

  public constructor(
    message: string,
    outcome: string,
    versions: InferredTrim[] = [],
    details: ErrorDetails = {},
  ) {
    super(message, details);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.outcome = outcome;
    this.versions = versions;
  }
}

export function makeHttpError(
  status: number,
  envelope:
    | {
        error?: { code?: string; description?: string };
        apiRequestId?: string;
        executionId?: string;
      }
    | undefined,
  headers?: Record<string, string | string[] | undefined>,
): AutotiaError {
  const apiError =
    envelope && envelope.error && typeof envelope.error === "object"
      ? envelope.error
      : {};
  const code = typeof apiError.code === "string" ? apiError.code : undefined;
  const message =
    typeof apiError.description === "string"
      ? apiError.description
      : status === 429
        ? "Límite de solicitudes alcanzado."
        : "La API devolvió un error HTTP.";
  const details: ErrorDetails = {
    status: status,
    code: code,
    apiRequestId:
      envelope && typeof envelope.apiRequestId === "string"
        ? envelope.apiRequestId
        : undefined,
    executionId:
      envelope && typeof envelope.executionId === "string"
        ? envelope.executionId
        : undefined,
    retryAfter: headerValue(headers, "retry-after"),
  };
  if (status === 400) return new BadRequestError(message, details);
  if (status === 401) return new AuthenticationError(message, details);
  if (status === 403) return new PermissionDeniedError(message, details);
  if (status === 404) return new NotFoundError(message, details);
  if (status === 409) return new ConflictError(message, details);
  if (status === 422) return new UnprocessableEntityError(message, details);
  if (
    status === 429 &&
    (code === "quota_exceeded" || code === "company_quota_exceeded")
  ) {
    return new QuotaExceededError(message, details);
  }
  if (status === 429) return new RateLimitError(message, details);
  if (status === 503 || status === 504)
    return new InternalServerError(message, details);
  return new AutotiaError(message, details);
}

function headerValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}
