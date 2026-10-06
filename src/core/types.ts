export type HttpMethod = "GET" | "POST";

export interface TransportRequest {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
  signal?: AbortSignalLike;
}

export interface TransportResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

export interface Transport {
  request(request: TransportRequest): Promise<TransportResponse>;
}

export interface AbortSignalLike {
  aborted: boolean;
  addEventListener(type: "abort", listener: () => void): void;
  removeEventListener?(type: "abort", listener: () => void): void;
}

export interface CallOptions {
  timeoutMs?: number;
  maxRetries?: number;
  signal?: AbortSignalLike;
  idempotencyKey?: string;
  ifNoneMatch?: string;
  pollAfterMs?: number;
}

export interface Envelope<T> {
  data: T | null;
  apiRequestId?: string;
  executionId?: string;
  durationMs?: number;
  pageToken?: string;
  error?: { code?: string; description?: string };
}
