# Registro de cambios

## Unreleased

- Las rutas de la API pasan de `/v1/vehicle-valuation` a `/v1/orders`.
- `valuationId` pasa a `orderId`, con formato `ordb2b_…` (33 caracteres Crockford base32).
- `reportType` es obligatorio en la creación del pedido (`OrderRequest`) y se incluye en las respuestas (`OrderAcceptance`, `OrderStatus`).
- Se agrega el campo opcional `saleId` (`sal_…`) en las respuestas de pedidos (`OrderAcceptance`, `OrderStatus`).
- Métodos del cliente renombrados:
  - `client.valuations.create(input, options?)` pasa a `client.orders.create(input, options?)`.
  - `client.valuations.get(valuationId, options?)` pasa a `client.orders.get(orderId, options?)`.
  - `client.valuations.waitUntilComplete(valuationId, options?)` pasa a `client.orders.waitUntilComplete(orderId, options?)`.
- Recursos y tipos renombrados:
  - `client.valuations` (`ValuationsResource`) pasa a `client.orders` (`OrdersResource`).
  - `ValuationRequest` pasa a `OrderRequest`.
  - `ValuationAcceptance` pasa a `OrderAcceptance`.
  - `ValuationStatus` pasa a `OrderStatus`.
  - `ValuationResult` pasa a `OrderResult`.
  - `ValuationFailure` pasa a `OrderFailure`.
- Clase de error renombrada: `ValuationFailedError` pasa a `OrderFailedError`.

## [0.1.0-beta.2] - 2026-10-07

- Primera pre-versión publicada (las versiones 0.1.0-beta.0 y 0.1.0-beta.1 no llegaron a publicarse; 0.1.0-beta.1 falló por falta de metadatos de repositorio para la procedencia npm).
- Añadidos metadatos de repositorio (`repository`, `homepage`, `bugs`) en `package.json`.

## [0.1.0-beta.1] - 2026-10-07

- Pre-versión que no llegó a publicarse en npm por falta de metadatos de repositorio para la verificación de procedencia Sigstore.

## [0.1.0-beta.0] - 2026-10-06

- Implementación inicial del SDK CommonJS para Node.js 11.15 a 22.11.
- Añadidos autenticación OAuth2, recursos de tasación y catálogo, reintentos y errores tipados.
