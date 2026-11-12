# Registro de cambios

## [5.0.0] - 2026-11-12

Versión mayor: una sola medida pública de confianza de versión y helper basado en niveles cualitativos. No se conservan alias ni compatibilidad con opciones retiradas.

- **Cambio incompatible:** se eliminan `certainty`, `ResolutionCertainty`, `topMargin` y `score` de los tipos de resolución, inferencia y candidatos. En `order.result.resolution`, `ResultResolution` tampoco tipa esos campos.
- `versionConfidence` y `versionBasis` son obligatorios para resultados `matched` de inferencia y resolución; en pedidos antiguos consultados con `GET`, se permiten omitidos. `TrimInferenceResult.outcome` queda en `matched` | `no_match`.
- **Cambio incompatible:** `createFromTrimText` elimina `minConfidence` y agrega `minVersionConfidence`, con niveles `EXACT` > `HIGH` > `MEDIUM` > `LOW` y valor por defecto `MEDIUM`.
- README, OpenAPI y fixtures de conformidad actualizados; guía de migración de 4.x a 5.0.

## [4.0.0] - 2026-11-11

- `versionConfidence` admite el nuevo valor `EXACT` (la versión llegó explícita y existe en el catálogo): `EXACT` | `HIGH` | `MEDIUM` | `LOW`.
- `versionBasis` admite el nuevo valor `MOST_COMMON` (se eligió la versión con más avisos del mercado): `TEXT` | `MOST_COMMON` | `LOWEST_PRICE` | `SIMPLEST`.
- Semántica vigente de la confianza: `HIGH` cuando el texto deja una sola versión; `MEDIUM` cuando el texto aporta al menos un dato mecánico y se eligió la versión base más común del mercado (o la más barata entre las igual de comunes) que representa una parte relevante de los avisos; `LOW` con la misma elección pero con poca información o pocos datos de mercado. Las versiones exclusivas con pocos avisos ya no se eligen por descarte.
- **Cambio incompatible:** `order.result` es ahora el resultado `report-result-v2` directamente. `schemaVersion`, `localization`, `vehicle`, `resolution` y `sections` están en `order.result`; se elimina el nivel `order.result.data` que la API nunca envió. Se elimina el tipo `OrderResultData`.
- **Cambio incompatible:** `Resolution.fields` (nivel de pedido y `catalog.resolveVehicle`) informa el kilometraje únicamente en `odometerKm` (obligatorio); se elimina `odometer`. Dentro del resultado, `order.result.resolution` usa el nuevo tipo `ResultResolution`, con el kilometraje en `fields.odometer` y sin `versionConfidence` ni `versionBasis`.
- **Cambio incompatible:** se eliminan `OrderStatus.pollAfterMs` (la consulta de estado no lo informa; el intervalo sugerido llega solo en la aceptación del pedido) y las secciones `listingAnalysis` y `priceHistory` con todos sus tipos (`ListingAnalysisSectionData`, `PriceHistorySectionData` y asociados), porque el producto de tasación solo entrega `price`, `comparables` y `usage`. Una sección futura sigue accesible mediante la firma de índice abierta de `ReportSections`.
- `OrderResultVehicle.versionResolution` pasa a ser opcional, como la API (se omite cuando no está disponible).
- README, especificación OpenAPI y suite de conformidad actualizados.

## [3.2.0] - 2026-11-10

- `versionConfidence` y `versionBasis` (opcionales): nuevos campos aditivos en la inferencia de versión (`TrimInferenceResult`) y en la resolución vehicular (`Resolution`).
  - `versionConfidence`: nivel de confianza en la identificación de la versión (`HIGH`, `MEDIUM`, `LOW`). El nivel bajo mide la identificación de la versión, no el riesgo de la tasación comercial. Se omite cuando no hay coincidencia (`outcome: no_match`) o si no está disponible.
  - `versionBasis`: criterio aplicado para la selección de la versión (`TEXT` por coincidencia textual o especificación directa, `LOWEST_PRICE` por desempate según menor precio mediano de mercado, `SIMPLEST` por desempate según versión base o más simple del catálogo). Se omite cuando no hay coincidencia (`outcome: no_match`) o si no está disponible.
- Actualización de la especificación OpenAPI (`openapi/vehicle-valuation-api.yaml`) incorporando los nuevos campos en `VersionInferenceResult` y `Resolution`.

## [3.1.0] - 2026-11-05

- `comparables[].versionIdentified` y `comparables[].regionIdentified` (opcionales): indican si se identificaron la versión y la región; en informes históricos ausentes, se interpretan mediante las cadenas `version` y `region`.
- La sección `comparables` incluye como máximo 5 publicaciones por informe.

## [3.0.0] - 2026-11-05

- Migración al resultado modular `report-result-v2`: el resultado de tasación se estructura en secciones independientes bajo `order.result.data.sections`.
- Secciones modulares tipadas:
  - `price` (`price-v2`): estadísticas detalladas de precios de transacción y publicación en CLP, percentiles, tamaño muestral, confianza y fecha de cálculo.
  - `comparables` (`comparables-v1`): publicaciones comparables directas y segregación de comparables lejanos (`distant`), con precios en CLP, kilometraje, región y similitud.
  - `usage` (`usage-v1`): kilometraje mediano anual y curva de uso proyectada por año.
  - `listingAnalysis` (`listing-analysis-v2`): métricas de absorción de mercado, días en vitrina e índice de demanda.
  - `priceHistory` (`price-history-v1`): tendencias y series históricas de precios. Cada serie de `regions` incluye `kind` (`region` o `zone`).
- `comparables[].imageUrl` (opcional): URL de la imagen de la publicación comparable.
- Compatibilidad hacia adelante: firma de índice abierta en `ReportSections` (`[key: string]: ReportSection | undefined`) para soportar secciones futuras sin requerir actualización del SDK.
- Ciclo de vida por sección con estados explícitos (`COMPLETED`, `RUNNING`, `FAILED`, `UNAVAILABLE`) y omisión de `data` cuando la sección no está completada.
- Documentación JSDoc exhaustiva en todas las clases, métodos, interfaces y propiedades exportadas (`@param`, `@returns`, `@throws`, `@example`).
- Paridad total con el SDK ESM moderno (`@autotia/vehicle-valuation-sdk`), incorporando el soporte de comparables previamente ausente en este paquete.
- Remoción de esquemas y tipos monolíticos obsoletos de la versión 1.x (`general-price-result-v1`).
- Actualización de especificación OpenAPI y suite de pruebas de conformidad con casos de secciones modulares y compatibilidad de esquemas futuros.

## [2.0.0] - 2026-10-27

- `orders.create` admite identificación por `search`, kilometraje y región opcionales, y devuelve `resolution`.
- Se agregan `catalog.resolveVehicle`, `catalog.inferMark` y `catalog.inferModel`.
- La inferencia de versión incluye el puntaje de selección y el margen entre alternativas.

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
