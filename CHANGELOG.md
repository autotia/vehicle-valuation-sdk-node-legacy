# Registro de cambios

## [0.1.0-beta.3] - 2026-10-19

- Las rutas de la API pasan de `/v1/vehicle-valuation` a `/v1/orders`.
- `valuationId` pasa a `orderId`, con formato `ordb2b_…` (33 caracteres Crockford base32).
- `reportType` es obligatorio al crear un pedido y se incluye en las respuestas; se agrega el campo opcional `saleId`.
- El recurso `client.valuations` y sus tipos pasan a llamarse `client.orders`, con los métodos `create`, `get` y `waitUntilComplete`; la clase `ValuationFailedError` pasa a `OrderFailedError`.
- Se agrega `client.catalog.inferTrim(input, options?)` para inferir versiones del catálogo vehicular a partir de marca, modelo, año y texto libre.
- Se agrega `client.orders.createFromTrimText(input, options?)` para solicitar una tasación a partir de una descripción libre de versión.
- Se agrega `TrimInferenceError` y los tipos públicos asociados a la inferencia de versiones y pedidos desde texto libre.
- La especificación OpenAPI incorpora `POST /v1/version-inference` y el código de error `year_not_found`.

## [0.1.0-beta.2] - 2026-10-07

- Primera pre-versión publicada (las versiones 0.1.0-beta.0 y 0.1.0-beta.1 no llegaron a publicarse; 0.1.0-beta.1 falló por falta de metadatos de repositorio para la procedencia npm).
- Añadidos metadatos de repositorio (`repository`, `homepage`, `bugs`) en `package.json`.

## [0.1.0-beta.1] - 2026-10-07

- Pre-versión que no llegó a publicarse en npm por falta de metadatos de repositorio para la verificación de procedencia Sigstore.

## [0.1.0-beta.0] - 2026-10-06

- Implementación inicial del SDK CommonJS para Node.js 11.15 a 22.11.
- Añadidos autenticación OAuth2, recursos de tasación y catálogo, reintentos y errores tipados.
