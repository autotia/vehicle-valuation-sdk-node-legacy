"use strict";

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const path = require("path");
const sdk = require("../dist");

const tests = [];
function test(name, fn) {
  tests.push({ name: name, fn: fn });
}
function json(status, data, extra) {
  const body = Object.assign(
    {
      data: data,
      apiRequestId: "req-test",
      executionId: "exec-test",
      durationMs: 1,
    },
    extra || {},
  );
  return {
    status: status,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}
function tokenResponse() {
  return {
    status: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      access_token: "test-access-token",
      token_type: "Bearer",
      expires_in: 3600,
    }),
  };
}
function memoryTransport(apiResponses, onToken) {
  let apiIndex = 0;
  let tokenCalls = 0;
  let apiCalls = 0;
  const transport = {
    request: async (request) => {
      if (request.url.indexOf("/oauth2/token") !== -1) {
        tokenCalls += 1;
        if (onToken) onToken(request);
        return tokenResponse();
      }
      apiCalls += 1;
      const response =
        apiResponses[Math.min(apiIndex, apiResponses.length - 1)];
      apiIndex += 1;
      if (response && response.transportFailure)
        throw new Error(response.transportFailure.message);
      return response;
    },
    counts: () => ({ tokenCalls: tokenCalls, apiCalls: apiCalls }),
  };
  return transport;
}
function clientWith(transport, extra) {
  return new sdk.VehicleValuationClient(
    Object.assign(
      {
        baseUrl: "https://example.test/public-secure/shop-b2b",
        tokenUrl: "https://auth.example.test/oauth2/token",
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        transport: transport,
        timeoutMs: 5000,
      },
      extra || {},
    ),
  );
}

test("requiere un preset o ambas URL explícitas", async () => {
  assert.throws(
    () =>
      new sdk.VehicleValuationClient({
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
      }),
    TypeError,
  );
  assert.throws(
    () => new sdk.VehicleValuationClient({ environment: "unknown" }),
    TypeError,
  );
});

test("obtiene token OAuth y omite scope por defecto", async () => {
  let formBody = "";
  let authorization = "";
  const transport = memoryTransport(
    [json(200, { catalogVersion: "v1", marks: [] })],
    (request) => {
      formBody = request.body;
      authorization = request.headers.Authorization;
    },
  );
  const client = clientWith(transport);
  const result = await client.catalog.listMarks();
  assert.deepStrictEqual(result, { catalogVersion: "v1", marks: [] });
  assert.strictEqual(formBody, "grant_type=client_credentials");
  assert.strictEqual(authorization.indexOf("Basic "), 0);
  assert.strictEqual(transport.counts().tokenCalls, 1);
});

test("scope opcional se serializa para Cognito", async () => {
  let formBody = "";
  const transport = memoryTransport(
    [json(200, { catalogVersion: "v1", marks: [] })],
    (request) => {
      formBody = request.body;
    },
  );
  await clientWith(transport, {
    scopes: ["catalog.read", "valuation.write"],
  }).catalog.listMarks();
  assert.strictEqual(
    formBody,
    "grant_type=client_credentials&scope=catalog.read+valuation.write",
  );
});

test("single-flight comparte una obtención de token concurrente", async () => {
  const transport = memoryTransport([
    json(200, { catalogVersion: "v1", marks: [] }),
    json(200, { catalogVersion: "v1", marks: [] }),
    json(200, { catalogVersion: "v1", marks: [] }),
    json(200, { catalogVersion: "v1", marks: [] }),
  ]);
  const client = clientWith(transport);
  await Promise.all([
    client.catalog.listMarks(),
    client.catalog.listMarks(),
    client.catalog.listMarks(),
    client.catalog.listMarks(),
  ]);
  assert.strictEqual(transport.counts().tokenCalls, 1);
});

test("refresca una vez ante 401", async () => {
  const transport = memoryTransport([
    json(401, null, {
      error: { code: "unauthorized", description: "credencial ausente" },
    }),
    json(200, { catalogVersion: "v1", marks: [] }),
  ]);
  const client = clientWith(transport);
  await client.catalog.listMarks();
  assert.deepStrictEqual(transport.counts(), { tokenCalls: 2, apiCalls: 2 });
});

test("reintenta throttling con dos reintentos por defecto", async () => {
  const previousRandom = Math.random;
  Math.random = () => 0;
  try {
    const transport = memoryTransport([
      {
        status: 429,
        headers: { "content-type": "text/plain" },
        body: "Too Many Requests",
      },
    ]);
    const client = clientWith(transport);
    await assert.rejects(
      client.catalog.listMarks(),
      (error) => error instanceof sdk.RateLimitError,
    );
    assert.strictEqual(transport.counts().apiCalls, 3);
  } finally {
    Math.random = previousRandom;
  }
});

test("no reintenta cuotas comerciales agotadas", async () => {
  const transport = memoryTransport([
    json(429, null, {
      error: { code: "quota_exceeded", description: "cuota agotada" },
    }),
  ]);
  await assert.rejects(
    clientWith(transport).valuations.create({ year: 2020, odometerKm: 50000 }),
    (error) => error instanceof sdk.QuotaExceededError,
  );
  assert.strictEqual(transport.counts().apiCalls, 1);
});

test("create genera una clave Idempotency-Key UUID v4", async () => {
  let apiRequest = null;
  const transport = memoryTransport([
    json(202, { valuationId: "val-1", status: "PENDING", pollAfterMs: 2000 }),
  ]);
  const originalRequest = transport.request;
  transport.request = async (request) => {
    if (request.url.indexOf("/oauth2/token") === -1) apiRequest = request;
    return originalRequest(request);
  };
  const result = await clientWith(transport).valuations.create({
    year: 2020,
    odometerKm: 50000,
  });
  assert.strictEqual(result.valuationId, "val-1");
  assert.strictEqual(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      apiRequest.headers["Idempotency-Key"],
    ),
    true,
  );
});

test("el waiter devuelve el estado terminal con result", async () => {
  const transport = memoryTransport([
    json(200, {
      valuationId: "val-1",
      status: "COMPLETED",
      result: { schemaVersion: "v1", data: {} },
    }),
  ]);
  const state = await clientWith(transport).valuations.waitUntilComplete(
    "val-1",
    { pollAfterMs: 0 },
  );
  assert.strictEqual(state.status, "COMPLETED");
  assert.deepStrictEqual(state.result, { schemaVersion: "v1", data: {} });
});

test("el waiter usa el intervalo de polling recibido al crear", async () => {
  const transport = memoryTransport([
    json(202, {
      valuationId: "val-interval",
      status: "PENDING",
      pollAfterMs: 17,
    }),
    json(202, { valuationId: "val-interval", status: "RUNNING" }),
    json(200, {
      valuationId: "val-interval",
      status: "COMPLETED",
      result: { schemaVersion: "v1", data: {} },
    }),
  ]);
  const client = clientWith(transport);
  const delays = [];
  const originalSetTimeout = global.setTimeout;
  global.setTimeout = (callback, delay) => {
    delays.push(delay);
    return originalSetTimeout(callback, 0);
  };
  try {
    await client.valuations.create({ year: 2020, odometerKm: 100 });
    const result = await client.valuations.waitUntilComplete("val-interval", {
      timeoutMs: 5000,
    });
    assert.strictEqual(result.status, "COMPLETED");
    assert.strictEqual(delays[0], 17);
  } finally {
    global.setTimeout = originalSetTimeout;
  }
});

test("catálogo usa If-None-Match y representa 304 como null", async () => {
  let apiRequest = null;
  const transport = memoryTransport([
    { status: 304, headers: { etag: '"v1"' }, body: "" },
  ]);
  const originalRequest = transport.request;
  transport.request = async (request) => {
    if (request.url.indexOf("/oauth2/token") === -1) apiRequest = request;
    return originalRequest(request);
  };
  const result = await clientWith(transport).catalog.listMarks({
    ifNoneMatch: '"v1"',
  });
  assert.strictEqual(result, null);
  assert.strictEqual(apiRequest.headers["If-None-Match"], '"v1"');
});

test("la integración local pasa por transporte HTTP sin red externa", async () => {
  const server = http.createServer((request, response) => {
    if (request.url === "/oauth2/token") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({ access_token: "test-access-token", expires_in: 3600 }),
      );
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({ data: { catalogVersion: "local", marks: [] } }),
    );
  });
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
  } catch (error) {
    if (error && error.code === "EPERM") return "skip";
    throw error;
  }
  const address = server.address();
  const localTransport = {
    request: (input) =>
      new Promise((resolve, reject) => {
        const target = new URL(input.url);
        const request = http.request(
          {
            hostname: "127.0.0.1",
            port: address.port,
            path: target.pathname,
            method: input.method,
            headers: input.headers,
          },
          (response) => {
            const chunks = [];
            response.on("data", (chunk) => {
              chunks.push(chunk);
            });
            response.on("end", () => {
              resolve({
                status: response.statusCode,
                headers: response.headers,
                body: Buffer.concat(chunks).toString("utf8"),
              });
            });
          },
        );
        request.on("error", reject);
        if (input.body) request.write(input.body);
        request.end();
      }),
  };
  try {
    const client = clientWith(localTransport, {
      baseUrl: `http://127.0.0.1:${address.port}/public-secure/shop-b2b`,
      tokenUrl: `http://127.0.0.1:${address.port}/oauth2/token`,
    });
    assert.deepStrictEqual(await client.catalog.listMarks(), {
      catalogVersion: "local",
      marks: [],
    });
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
});

test("conformidad con los fixtures compartidos", async () => {
  const fixturePath = path.join(__dirname, "conformance", "fixtures.json");
  const fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const previousRandom = Math.random;
  Math.random = () => 0;
  try {
    for (const item of fixtures.cases) {
      const transportResponses = item.transportFailure
        ? [item]
        : item.responses.map((response) =>
            Object.assign({}, response, {
              body:
                typeof response.body === "string"
                  ? response.body
                  : JSON.stringify(response.body),
            }),
          );
      const transport = memoryTransport(transportResponses);
      const client = clientWith(transport, {
        maxRetries: item.expected.retry.maxRetries,
      });
      const options = {
        timeoutMs: 5000,
        pollAfterMs: 1,
        maxRetries: item.expected.retry.maxRetries,
      };
      let operation = null;
      if (item.operation === "valuations.waitUntilComplete") {
        operation = client.valuations.waitUntilComplete("fixture-id", options);
      } else if (item.request.method === "POST") {
        operation = client.valuations.create(
          { year: 2020, odometerKm: 50000 },
          options,
        );
      } else if (item.request.path.indexOf("/vehicle-valuation/") !== -1) {
        operation = client.valuations.get("unknown", options);
      } else if (item.request.path.indexOf("/catalog/") === -1) {
        operation = client.catalog.listMarks(options);
      } else if (item.request.path.split("/").length === 4) {
        operation = client.catalog.listModels("toyota", options);
      } else if (item.request.path.split("/").length === 5) {
        operation = client.catalog.listYears("toyota", "yaris", options);
      } else {
        operation = client.catalog.listTrims("toyota", "yaris", 2020, options);
      }
      if (item.expected.kind === "value") {
        const value = await operation;
        assert.deepStrictEqual(value, item.expected.value, item.id);
      } else {
        await assert.rejects(operation, (error) => {
          assert.strictEqual(error.name, item.expected.class, item.id);
          assert.strictEqual(
            error.code === undefined ? null : error.code,
            item.expected.code,
            item.id,
          );
          return true;
        });
      }
      if (item.expected.tokenRefreshes !== undefined)
        assert.strictEqual(
          transport.counts().tokenCalls - 1,
          item.expected.tokenRefreshes,
          item.id,
        );
      if (item.expected.retry.retryable && item.expected.kind === "error") {
        assert.strictEqual(
          transport.counts().apiCalls,
          item.expected.retry.maxRetries + 1,
          item.id,
        );
      }
    }
  } finally {
    Math.random = previousRandom;
  }
});

test("dist no contiene sintaxis ni APIs posteriores a ES2018/Node 11", async () => {
  const distRoot = path.join(__dirname, "..", "dist");
  const forbidden = [
    { name: "optional chaining", pattern: /\?\./ },
    { name: "nullish coalescing", pattern: /\?\?/ },
    { name: "campos privados", pattern: /#[A-Za-z_$]/ },
    { name: "fetch", pattern: /\bfetch\s*\(/ },
    { name: "Headers", pattern: /\bHeaders\b/ },
    { name: "AbortController", pattern: /\bAbortController\b/ },
    { name: "AbortSignal", pattern: /\bAbortSignal\b/ },
    { name: "globalThis", pattern: /\bglobalThis\b/ },
    { name: "randomUUID", pattern: /\brandomUUID\b/ },
    { name: "Object.fromEntries", pattern: /Object\.fromEntries/ },
    { name: "matchAll", pattern: /\.matchAll\s*\(/ },
    { name: "replaceAll", pattern: /\.replaceAll\s*\(/ },
    { name: "Array.at", pattern: /\.at\s*\(/ },
    {
      name: "Promise.allSettled/any",
      pattern: /Promise\.(allSettled|any)\s*\(/,
    },
    { name: "structuredClone", pattern: /\bstructuredClone\b/ },
    { name: "node: imports", pattern: /require\(["']node:|from ["']node:/ },
    { name: "timers/promises", pattern: /timers\/promises/ },
    { name: "fs/promises", pattern: /fs\/promises/ },
  ];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (entry.name.endsWith(".js") || entry.name.endsWith(".d.ts")) {
        const source = fs.readFileSync(entryPath, "utf8");
        for (const rule of forbidden)
          assert.strictEqual(
            rule.pattern.test(source),
            false,
            `${entryPath} contiene ${rule.name}`,
          );
      }
    }
  }
  visit(distRoot);
});

(async function main() {
  let failures = 0;
  let skipped = 0;
  for (const item of tests) {
    try {
      const result = await item.fn();
      if (result === "skip") {
        skipped += 1;
        process.stdout.write(
          `skip - ${item.name} (el entorno bloquea sockets locales)\n`,
        );
      } else process.stdout.write(`ok - ${item.name}\n`);
    } catch (error) {
      failures += 1;
      process.stderr.write(
        `not ok - ${item.name}\n${error && error.stack ? error.stack : String(error)}\n`,
      );
    }
  }
  process.stdout.write(
    `${String(tests.length - failures - skipped)}/${tests.length} pruebas aprobadas; ${skipped} omitidas\n`,
  );
  if (failures) process.exitCode = 1;
})();
