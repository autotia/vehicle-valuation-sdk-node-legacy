import type { ClientRequest } from "http";
import * as https from "https";
import { URL } from "url";
import { AutotiaConnectionError } from "../core/errors";
import type {
  Transport,
  TransportRequest,
  TransportResponse,
} from "../core/types";

export class HttpsTransport implements Transport {
  private readonly agent: https.Agent;

  public constructor() {
    this.agent = new https.Agent({ keepAlive: true, minVersion: "TLSv1.2" });
  }

  public request(input: TransportRequest): Promise<TransportResponse> {
    return new Promise((resolve, reject) => {
      if (input.signal && input.signal.aborted) {
        reject(new AutotiaConnectionError("La solicitud fue cancelada."));
        return;
      }
      const target = new URL(input.url);
      let settled = false;
      const finishError = (error: Error): void => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(
          error instanceof AutotiaConnectionError
            ? error
            : new AutotiaConnectionError("Falló la conexión con la API.", {
                cause: error,
              }),
        );
      };
      const cleanup = (): void => {
        if (input.signal && input.signal.removeEventListener)
          input.signal.removeEventListener("abort", onAbort);
      };
      let req: ClientRequest;
      const onAbort = (): void => {
        req.destroy(new Error("aborted"));
        finishError(new AutotiaConnectionError("La solicitud fue cancelada."));
      };
      try {
        req = https.request(
          {
            protocol: target.protocol,
            hostname: target.hostname,
            port: target.port,
            path: target.pathname + target.search,
            method: input.method,
            headers: input.headers,
            agent: this.agent,
            minVersion: "TLSv1.2",
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer | string) =>
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
            );
            res.on("error", finishError);
            res.on("end", () => {
              if (settled) return;
              settled = true;
              cleanup();
              const headers: Record<string, string | string[] | undefined> = {};
              for (const key of Object.keys(res.headers)) {
                headers[key.toLowerCase()] = res.headers[key];
              }
              resolve({
                status: res.statusCode || 0,
                headers: headers,
                body: Buffer.concat(chunks).toString("utf8"),
              });
            });
          },
        );
      } catch (error) {
        finishError(
          error instanceof Error ? error : new Error("request failed"),
        );
        return;
      }
      if (input.signal) input.signal.addEventListener("abort", onAbort);
      req.setTimeout(input.timeoutMs, () => req.destroy(new Error("timeout")));
      req.on("error", finishError);
      if (input.body !== undefined) req.write(input.body);
      req.end();
    });
  }
}
