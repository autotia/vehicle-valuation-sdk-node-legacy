# Registro de cambios

## [3.0.0] - Unreleased

- Migración al resultado modular `report-result-v2`: el resultado de tasación se estructura en secciones independientes bajo `order.result.data.sections`.
- Secciones modulares tipadas:
  - `price` (`price-v2`): estadísticas detalladas de precios de transacción y publicación en CLP, percentiles, tamaño muestral, confianza y fecha de cálculo.
  - `comparables` (`comparables-v1`): publicaciones comparables directas y segregación de comparables lejanos (`distant`), con precios en CLP, kilometraje, región y similitud.
  - `usage` (`usage-v1`): kilometraje mediano anual y curva de uso proyectada por año.
  - `listingAnalysis` (`listing-analysis-v2`): métricas de absorción de mercado, días en vitrina e índice de demanda.
  - `priceHistory` (`price-history-v1`): tendencias y series históricas de precios.
- Compatibilidad hacia adelante: firma de índice abierta en `ReportSections` (`[key: string]: ReportSection | undefined`) para soportar secciones futuras sin requerir actualización del SDK.
- Ciclo de vida por sección con estados explícitos (`COMPLETED`, `RUNNING`, `FAILED`, `UNAVAILABLE`) y omisión de `data` cuando la sección no está completada.
- Documentación JSDoc exhaustiva en todas las clases, métodos, interfaces y propiedades exportadas (`@param`, `@returns`, `@throws`, `@example`).
- Paridad total con el SDK ESM moderno (`@autotia/vehicle-valuation-sdk`), incorporando el soporte de comparables previamente ausente en este paquete.
- Remoción de esquemas y tipos monolíticos obsoletos de la versión 1.x (`general-price-result-v1`).
- Actualización de especificación OpenAPI y suite de pruebas de conformidad con casos de secciones modulares y compatibilidad de esquemas futuros.

## [2.0.0] - Unreleased

- `orders.create` admite identificación por `search`, kilometraje y región opcionales, y devuelve `resolution`.
- Se agregan `catalog.resolveVehicle`, `catalog.inferMark` y `catalog.inferModel`.
- La inferencia de versión incluye `score` y `topMargin`.

## [1.0.1] - 2026-10-20

- Documentación actualizada: se remueve aviso de desarrollo en README y se describe el flujo vigente de publicación.
- Publicación simplificada en GitHub Actions: se remueve el soporte de bootstrap/tokens y se publica exclusivamente con Trusted Publishing (OIDC).

## [1.0.0] - 2026-10-20

- Primera versión estable publicada en npm con dist-tag `latest`.
- Conserva la misma API pública y funcionalidad que `0.1.0-beta.3`.

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
