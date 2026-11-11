# @autotia/vehicle-valuation-sdk-legacy

SDK oficial de Node.js y CommonJS para la API B2B de tasación vehicular de Autotia (Chile). Compatible con Node.js 11.15 a 22.11.

## ¿Qué paquete necesito?

| Tu entorno | Paquete |
|---|---|
| Node.js 22.12 o superior | [`@autotia/vehicle-valuation-sdk`](https://github.com/autotia/vehicle-valuation-sdk-node) |
| Node.js 11.15 a 22.11 | `@autotia/vehicle-valuation-sdk-legacy` (este repositorio) |

Ambos paquetes ofrecen la misma API y el mismo comportamiento.

## Instalación

```bash
npm install @autotia/vehicle-valuation-sdk-legacy
```

El paquete es CommonJS estricto (ES2018) y no tiene dependencias externas.

## Uso rápido

```js
const { VehicleValuationClient } = require("@autotia/vehicle-valuation-sdk-legacy");

const client = new VehicleValuationClient({
  clientId: process.env.AUTOTIA_CLIENT_ID,
  clientSecret: process.env.AUTOTIA_CLIENT_SECRET,
  environment: "prod", // o "dev"
});

async function main() {
  // 1. Solicitar el informe de tasación
  const acceptance = await client.orders.create({
    reportType: "general-price",
    mark: "Toyota",
    model: "Yaris",
    year: 2021,
    version: "1.5",
    region: "13", // Región Metropolitana de Santiago
    odometerKm: 50000,
  });

  // 2. Esperar a que el procesamiento asíncrono finalice
  const order = await client.orders.waitUntilComplete(acceptance.orderId);

  // 3. Consumir las secciones modulares del resultado v2
  if (order.result && order.result.schemaVersion === "report-result-v2") {
    const price = order.result.sections.price && order.result.sections.price.data;
    if (price) {
      console.log("Calidad de tasación: " + price.qualityScore + "/100");
      console.log("Rango sugerido de compra: $" + price.purchase.minPrice + " a $" + price.purchase.maxPrice + " CLP");
      console.log("Rango sugerido de venta: $" + price.sale.minPrice + " a $" + price.sale.maxPrice + " CLP");
      console.log("Margen bruto promedio: $" + price.grossMarginEstimate.avgGrossMargin + " CLP (" + price.grossMarginEstimate.avgGrossMarginPercent + "%)");
    }

    const comparables = order.result.sections.comparables && order.result.sections.comparables.data;
    if (comparables) {
      console.log("Comparables directos encontrados: " + comparables.items.length);
      for (const item of comparables.items) {
        console.log("- $" + item.price + " CLP (" + item.odometer + " km, " + item.region + (item.distant ? ", referencia lejana" : "") + ")");
      }
    }
  }
}

main().catch(console.error);
```

La tasación es asíncrona: `create` la solicita y `waitUntilComplete` consulta su estado respetando el intervalo que indica la API, hasta que termina (`COMPLETED`) o vence el plazo.

---

## Referencia de API

### Inicialización: `new VehicleValuationClient(options)`

Crea una nueva instancia del cliente de tasación vehicular.

**Firma TypeScript:**
```ts
constructor(options: VehicleValuationClientOptions)
```

**Parámetros:**
```ts
interface VehicleValuationClientOptions {
  environment?: "dev" | "prod";
  baseUrl?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  tokenProvider?: TokenProvider;
  scopes?: string[];
  timeoutMs?: number;   // Por defecto: 30000 ms
  maxRetries?: number;  // Por defecto: 2
  transport?: HttpTransport;
}
```

- **Preset de entorno:** Especifica `environment: "prod"` o `environment: "dev"`.
- **URLs manuales:** Alternativamente, puedes indicar `baseUrl` y `tokenUrl` directamente.
- **Autenticación:** Requiere `clientId` y `clientSecret` para flujo OAuth2 Client Credentials automático, o un `tokenProvider` si tu aplicación administra los tokens.
- **Reintentos:** Reintenta automáticamente errores de red y respuestas `503`, `504` o `429` (respetando encabezados `Retry-After`).

**Errores lanzados (`@throws`):**
- `TypeError`: Si faltan credenciales o la configuración de URLs/entorno es inconsistente.

**Ejemplo:**
```js
const client = new VehicleValuationClient({
  environment: "dev",
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
});
```

---

### `client.orders.create(input, options?)`

Solicita la creación asíncrona de un nuevo pedido de tasación vehicular.

**Firma TypeScript:**
```ts
orders.create(
  input: OrderRequest,
  options?: CallOptions
): Promise<OrderAcceptance | OrderStatus>
```

**Parámetros:**
- `input`:
  ```ts
  type OrderRequest = {
    reportType: "general-price";
    mark: string;
    year: number;
    region?: string;      // Código de región chilena (ej: "13" para Metropolitana). Si se omite, aplica precio nacional.
    odometerKm?: number;  // Si se omite, se infiere según la mediana de la curva de uso.
  } & (
    | { model: string; version: string; search?: never }
    | { search: string; model?: never; version?: never }
  );
  ```
- `options?: CallOptions`:
  ```ts
  interface CallOptions {
    timeoutMs?: number;
    signal?: AbortLikeSignal;
    idempotencyKey?: string; // UUID v4 único. Si no se entrega, se genera automáticamente.
    ifNoneMatch?: string;
  }
  ```

**Retorno (`OrderAcceptance`):**
```ts
interface OrderAcceptance {
  orderId: string;           // Prefijo 'ordb2b_' (ej: 'ordb2b_01j7x000000000000000000000')
  reportType: "general-price";
  status: "PENDING" | "RUNNING";
  pollAfterMs: number;       // Milisegundos sugeridos para la siguiente consulta
  saleId?: string;           // Prefijo 'sal_'
  resolution?: Resolution;   // Metadatos de resolución si el vehículo fue resuelto inmediatamente
}
```

**Errores lanzados (`@throws`):**
- `BadRequestError` (HTTP 400): Campos requeridos ausentes o inválidos.
- `AuthenticationError` (HTTP 401): Credenciales inválidas.
- `PermissionDeniedError` (HTTP 403): Alcance insuficiente o cuenta suspendida.
- `ConflictError` (HTTP 409): Conflicto con la clave de idempotencia provista.
- `QuotaExceededError` (HTTP 429): Cuota comercial contratada agotada.
- `RateLimitError` (HTTP 429): Límite de tasa por segundo superado.
- `InternalServerError` (HTTP 500, 502, 503, 504): Falla temporal del servidor.
- `AutotiaConnectionError`: Problemas de red o tiempo de conexión agotado.

**Ejemplo chileno:**
```js
const acceptance = await client.orders.create({
  reportType: "general-price",
  mark: "Toyota",
  model: "Yaris",
  year: 2021,
  version: "1.5",
  region: "13",
  odometerKm: 50000,
}, { idempotencyKey: "pedido-yaris-2021-001" });

console.log("Pedido aceptado: " + acceptance.orderId + ", consultar en " + (acceptance.pollAfterMs || 2000) + " ms");
```

---

### `client.orders.createFromTrimText(input, options?)`

Infiere la versión exacta del vehículo a partir de texto libre de publicación y solicita inmediatamente la tasación en un único paso atómico.

**Firma TypeScript:**
```ts
orders.createFromTrimText(
  input: OrderFromTrimTextRequest,
  options?: OrderFromTrimTextOptions
): Promise<OrderFromTrimTextResult>
```

**Parámetros:**
- `input`:
  ```ts
  interface OrderFromTrimTextRequest {
    reportType: "general-price";
    mark: string;
    model: string;
    year: number;
    trimText: string;     // Texto libre (ej: "1.2 PureTech Allure 5p")
    region?: string;
    odometerKm?: number;
    limit?: number;
  }
  ```
- `options?: OrderFromTrimTextOptions`:
  ```ts
  interface OrderFromTrimTextOptions extends CallOptions {
    minVersionConfidence?: VersionConfidence; // Por defecto "MEDIUM"
  }
  ```

**Retorno (`OrderFromTrimTextResult`):**
```ts
interface OrderFromTrimTextResult {
  order: OrderAcceptance | OrderStatus;
  selectedVersion: string;
  inference: TrimInferenceResult;
}
```

**Errores lanzados (`@throws`):**
- `TrimInferenceError`: Si el texto no coincide con ninguna versión (`no_match`) o si `versionConfidence` queda bajo `minVersionConfidence` (por defecto `MEDIUM`).
- Errores estándar de `orders.create`.

**Ejemplo chileno:**
```js
const { TrimInferenceError } = require("@autotia/vehicle-valuation-sdk-legacy");

try {
  const result = await client.orders.createFromTrimText({
    reportType: "general-price",
    mark: "Peugeot",
    model: "208",
    year: 2021,
    trimText: "1.2 PureTech Allure 5p",
    region: "13",
    odometerKm: 38000,
  }, { minVersionConfidence: "MEDIUM" });

  console.log("Versión inferida y seleccionada: " + result.selectedVersion);
  console.log("Pedido de tasación creado: " + result.order.orderId);
} catch (error) {
  if (error instanceof TrimInferenceError) {
    console.warn("No se pudo inferir la versión con certeza (" + error.outcome + "). Opciones:", error.versions);
  } else {
    throw error;
  }
}
```

---

### `client.orders.get(orderId, options?)`

Consulta el estado actual de un pedido de tasación previamente creado.

**Firma TypeScript:**
```ts
orders.get(
  orderId: string,
  options?: CallOptions
): Promise<OrderStatus>
```

**Retorno (`OrderStatus`):**
```ts
interface OrderStatus {
  orderId: string;
  reportType: "general-price" | string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  saleId?: string;
  result?: OrderResult;
  failure?: OrderFailure;
  resolution?: Resolution;
}
```

**Errores lanzados (`@throws`):**
- `NotFoundError` (HTTP 404): Si el pedido no existe o pertenece a otro cliente.
- `AuthenticationError` (HTTP 401), `PermissionDeniedError` (HTTP 403), `RateLimitError` (HTTP 429), `InternalServerError`.

**Ejemplo:**
```js
const status = await client.orders.get("ordb2b_01j7x000000000000000000000");
if (status.status === "COMPLETED") {
  console.log("Tasación lista para consumo.");
} else if (status.status === "FAILED") {
  console.error("Tasación fallida:", status.failure && status.failure.description);
}
```

---

### `client.orders.waitUntilComplete(orderId, options?)`

Realiza sondeo periódico inteligente hasta que el pedido alcanza el estado terminal `COMPLETED`.

**Firma TypeScript:**
```ts
orders.waitUntilComplete(
  orderId: string,
  options?: WaitUntilCompleteOptions
): Promise<OrderStatus>
```

**Parámetros:**
- `options?: WaitUntilCompleteOptions`:
  ```ts
  interface WaitUntilCompleteOptions {
    timeoutMs?: number;   // Tiempo máximo total de espera (por defecto: 120000 ms)
    pollAfterMs?: number; // Sobrescribe el intervalo de espera entre consultas
    signal?: AbortLikeSignal; // Permite cancelar el sondeo prematuramente
  }
  ```

**Retorno:** Devuelve el `OrderStatus` en estado `COMPLETED`.

**Errores lanzados (`@throws`):**
- `OrderFailedError`: Si el informe termina con estado `FAILED` (ej: `data_unavailable`).
- `WaiterTimeoutError`: Si transcurre `timeoutMs` sin que el pedido finalice.

---

### `client.catalog.listMarks(options?)`

Lista las marcas de vehículos disponibles en el catálogo oficial de Autotia.

**Firma TypeScript:**
```ts
catalog.listMarks(options?: CallOptions): Promise<CatalogMarks | null>
```

**Retorno (`CatalogMarks | null`):**
```ts
interface CatalogMarks {
  catalogVersion: string;
  marks: Array<{
    id: string;   // Clave canónica (ej: 'toyota')
    name: string; // Nombre visible (ej: 'Toyota')
  }>;
}
```
*(Devuelve `null` si se suministra encabezado `ifNoneMatch` y el servidor responde HTTP 304 Not Modified).*

**Ejemplo:**
```js
const marks = await client.catalog.listMarks();
if (marks) {
  console.log("Marcas disponibles (" + marks.marks.length + "):", marks.marks.slice(0, 5));
}
```

---

### `client.catalog.listModels(mark, options?)`

Lista los modelos disponibles para una marca en el catálogo.

**Firma TypeScript:**
```ts
catalog.listModels(mark: string, options?: CallOptions): Promise<CatalogModels | null>
```

**Retorno (`CatalogModels | null`):**
```ts
interface CatalogModels {
  catalogVersion: string;
  mark: string;
  models: Array<{
    id: string;   // Clave canónica del modelo (ej: 'yaris')
    name: string; // Nombre visible (ej: 'Yaris')
  }>;
}
```

**Ejemplo:**
```js
const models = await client.catalog.listModels("toyota");
if (models) {
  console.log("Modelos de Toyota:", models.models.map(function(m) { return m.name; }));
}
```

---

### `client.catalog.listYears(mark, model, options?)`

Lista los años comerciales registrados para un modelo en el catálogo.

**Firma TypeScript:**
```ts
catalog.listYears(mark: string, model: string, options?: CallOptions): Promise<CatalogYears | null>
```

**Retorno (`CatalogYears | null`):**
```ts
interface CatalogYears {
  catalogVersion: string;
  mark: string;
  model: string;
  years: number[]; // Años disponibles ordenados descendentemente (ej: [2024, 2023, 2022, ...])
}
```

**Ejemplo:**
```js
const years = await client.catalog.listYears("toyota", "yaris");
if (years) {
  console.log("Años para Toyota Yaris:", years.years);
}
```

---

### `client.catalog.listTrims(mark, model, year, options?)`

Lista las versiones normalizadas del catálogo para el año y modelo especificados.

**Firma TypeScript:**
```ts
catalog.listTrims(
  mark: string,
  model: string,
  year: number,
  options?: CallOptions
): Promise<CatalogTrims | null>
```

**Retorno (`CatalogTrims | null`):**
```ts
interface CatalogTrims {
  catalogVersion: string;
  mark: string;
  model: string;
  year: number;
  trims: Array<{
    id: string;      // Clave canónica de la versión
    name: string;    // Nombre descriptivo (ej: '1.5 GL MT')
    fuel?: string;   // Tipo de combustible
    trans?: string;  // Tipo de transmisión
  }>;
}
```

**Ejemplo:**
```js
const trims = await client.catalog.listTrims("toyota", "yaris", 2021);
if (trims) {
  console.log("Versiones Toyota Yaris 2021:", trims.trims.map(function(t) { return t.name; }));
}
```

---

### `client.catalog.resolveVehicle(input, options?)`

Pre-valida y resuelve marca, modelo, año, región y odómetro antes de solicitar una tasación.

**Firma TypeScript:**
```ts
catalog.resolveVehicle(
  input: VehicleResolutionRequest,
  options?: CallOptions
): Promise<VehicleResolutionResult>
```

**Parámetros:**
```ts
interface VehicleResolutionRequest {
  mark?: string;
  model?: string;
  year?: number;
  version?: string;
  search?: string;
  odometerKm?: number;
  region?: string;
}
```

**Retorno (`VehicleResolutionResult`):**
```ts
interface VehicleResolutionResult {
  mark: string;
  model: string;
  year: number;
  version: string;
  region: string;       // vacía si es precio nacional
  odometerKm: number;
  resolution: Resolution;
}

interface Resolution {
  catalogVersion: string;
  sourceCatalogVersion: string;
  usageCurveVersion?: string;
  referenceYear: number;
  search?: string;
  versionConfidence: VersionConfidence;
  versionBasis: VersionBasis;
  fields: {
    model: { value: string; source: string };
    version: { value: string; source: string };
    region: { value: string; source: string };
    odometerKm: { value: number; source: string };
  };
  selected: { model: string; version: string; confidence: number };
  alternatives: Array<{ model: string; version: string; confidence: number }>;
}
```

**Ejemplo:**
```js
const resolution = await client.catalog.resolveVehicle({
  search: "Toyota Yaris 2021 1.5",
  region: "13",
});
console.log("Confianza de versión: " + resolution.versionConfidence, resolution.selected);
```

---

### `client.catalog.inferMark(input, options?)`

Sugiere marcas a partir de texto libre o con posibles errores tipográficos.

**Firma TypeScript:**
```ts
catalog.inferMark(
  input: MarkInferenceRequest,
  options?: CallOptions
): Promise<MarkInferenceResult>
```

**Ejemplo:**
```js
const result = await client.catalog.inferMark({ text: "Toyta", limit: 3 });
console.log("Marcas sugeridas:", result.marks);
```

---

### `client.catalog.inferModel(input, options?)`

Sugiere modelos a partir de marca, año y texto preliminar.

**Firma TypeScript:**
```ts
catalog.inferModel(
  input: ModelInferenceRequest,
  options?: CallOptions
): Promise<ModelInferenceResult>
```

**Ejemplo:**
```js
const result = await client.catalog.inferModel({
  mark: "Toyota",
  year: 2021,
  text: "Yar",
});
console.log("Modelos sugeridos:", result.models);
```

---

### `client.catalog.inferTrim(input, options?)`

Infiere versiones del catálogo vehicular a partir de marca, modelo, año y texto libre.

**Firma TypeScript:**
```ts
catalog.inferTrim(
  input: TrimInferenceRequest,
  options?: CallOptions
): Promise<TrimInferenceResult>
```

**Parámetros:**
```ts
interface TrimInferenceRequest {
  mark: string;
  model: string;
  year: number;
  text: string;
  limit?: number;
}
```

**Retorno (`TrimInferenceResult`):**
```ts
type TrimInferenceResult =
  | {
      outcome: "matched";
      versions: [InferredTrim, ...InferredTrim[]];
      totalCandidates: number;
      versionConfidence: VersionConfidence;
      versionBasis: VersionBasis;
    }
  | {
      outcome: "no_match";
      versions: InferredTrim[];
      totalCandidates: number;
      versionConfidence?: never;
      versionBasis?: never;
    };

interface InferredTrim {
  version: string;
  confidence: number; // 0 a 100
}
```

`versionConfidence` y `versionBasis` son obligatorios cuando `outcome` es `matched`; se omiten cuando es `no_match`.
- `versionConfidence` (`EXACT` | `HIGH` | `MEDIUM` | `LOW`): nivel de confianza en la identificación de la versión seleccionada. El nivel bajo mide la identificación de la versión, no el riesgo de la tasación comercial. Se omite con `outcome: no_match`.
  - `EXACT`: la versión llegó explícita y existe en el catálogo.
  - `HIGH`: el texto deja una sola versión posible.
  - `MEDIUM`: el texto aporta al menos un dato mecánico y se eligió la versión base más común del mercado (o la más barata entre las igual de comunes), que además representa una parte relevante de los avisos.
  - `LOW`: misma elección que `MEDIUM`, pero con poca información en el texto o pocos datos de mercado.
- `versionBasis` (`TEXT` | `MOST_COMMON` | `LOWEST_PRICE` | `SIMPLEST`): criterio aplicado en la selección (`TEXT` por coincidencia textual o especificación directa, `MOST_COMMON` por ser la versión con más avisos del mercado, `LOWEST_PRICE` por desempate según menor precio de mercado, `SIMPLEST` por desempate según versión base o más simple del catálogo). Se omite con `outcome: no_match`. Las versiones exclusivas con pocos avisos ya no se eligen por descarte.
```

**Ejemplo:**
```js
const inference = await client.catalog.inferTrim({
  mark: "Peugeot",
  model: "208",
  year: 2021,
  text: "1.2 PureTech Allure 5p",
});
console.log("Resultado inferencia: " + inference.outcome, inference.versions);
```

---

## Estructura del Resultado (`report-result-v2`)

Cuando un pedido finaliza con éxito (`order.status === "COMPLETED"`), el objeto `order.result` entrega la versión `"report-result-v2"`.

La respuesta consta de metadatos globales (`localization`, `vehicle`, `resolution`) y un contenedor modular de **secciones independientes** (`sections`):

```ts
interface OrderResult {
  schemaVersion: "report-result-v2" | string;
  localization: Localization;
  vehicle: OrderResultVehicle;
  resolution: ResultResolution; // el kilometraje va en fields.odometer
  sections: ReportSections;
}
```

### Envoltorio de Sección (`ReportSection`)

Cada sección sigue un formato uniforme:

```ts
interface ReportSection<S extends string, T> {
  schema: S | string;             // Identificador canónico (ej: 'price-v2', 'comparables-v1')
  status: "AVAILABLE" | "UNAVAILABLE" | "FAILED" | string;
  data?: T;                       // Presente únicamente cuando status es 'AVAILABLE'
}
```

- **`AVAILABLE`**: Sección calculada con éxito; `data` contiene el payload estructurado.
- **`UNAVAILABLE`**: El cálculo finalizó correctamente, pero no hubo evidencia estadística o datos suficientes en el mercado (por ejemplo, falta de publicaciones para trazar comparables).
- **`FAILED`**: Error técnico en el procesamiento de la sección; `data` es `null` o indefinido.
- **Sección no contratada**: La propiedad se omite por completo en el JSON (`undefined`).
- **Firma de índice abierta**: `sections` admite `[key: string]: ReportSection | undefined`, permitiendo que nuevas secciones introducidas por la plataforma se consuman sin romper clientes existentes.

---

### Secciones Disponibles

1. **`price` (`price-v2`)** — *Presente en todos los informes de tasación B2B (`general-price`)*:
   - `qualityScore`: Puntaje de confianza y calidad de la estimación (0 a 100).
   - `qualityInputs`: Métricas de regresión (soporte, peso efectivo, convergencia, correcciones).
   - `marketContext`: Contexto geográfico (`requestedRegion`, `appliedRegion`, `isNationalReference`) y kilometraje evaluado (`odometer`).
   - `purchase`: Rango sugerido de compra (`minPrice`, `maxPrice`) sobre la curva de mercado (percentiles P20 a P40).
   - `sale`: Rango sugerido de venta (`minPrice`, `maxPrice`) sobre la curva de mercado (percentiles P70 a P80).
   - `grossMarginEstimate`: Estimación de margen bruto comercial (`purchaseRange`, `saleRange`, `minGrossMargin`, `minGrossMarginPercent`, `maxGrossMargin`, `maxGrossMarginPercent`, `avgGrossMargin`, `avgGrossMarginPercent`).
   - `priceDistribution`: Curvas de los 11 percentiles canónicos (10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90) para `market`, `private` y `dealer`.
   - `freshness`: Vigencia de los datos analizados (`lastValidLogicalDay`, `ageDays`, `status`).
   - `methodology`: Versiones algorítmicas aplicadas (`qualityVersion`, `smoothingVersion`, `algorithmVersion`).
   - `sample` (opcional): Conteos de muestra observados por tipo de vendedor.

2. **`comparables` (`comparables-v1`)** — *Presente en informes de tasación B2B (`general-price`)*:
   - `items`: Lista de hasta 5 publicaciones observadas en portales chilenos. Cada comparable incluye `portal`, `publicationId`, `url`, `price` en CLP, `year`, `odometer` en km, `version`, `region`, `sellerType` (`dealer` o `private`), fechas de observación, indicador `distant: boolean` (si fue incluido para cumplir la cuota mínima de comparables) y diferencias `diff` (`yearDelta`, `odometerDelta`, `sameVersion`, `sameRegion`). `versionIdentified` y `regionIdentified` son opcionales en el tipo; en informes nuevos indican si se identificó el valor asociado. Si son `false`, el valor correspondiente es `""`. En informes históricos que no incluyen estos campos, use `version !== ""` o `region !== ""` para determinar si el dato está identificado. Opcionalmente incluye `imageUrl` (URL de la imagen de la publicación); se omite cuando la publicación no tiene imagen.
   - `model`: Algoritmo y día lógico de búsqueda de comparables.
   - `selection`: Métricas de candidatos evaluados y tolerancias.

   Ejemplo de una publicación nueva sin versión ni región identificadas:

   ```json
   {
     "version": "",
     "versionIdentified": false,
     "region": "",
     "regionIdentified": false
   }
   ```

3. **`usage` (`usage-v1`)** — *Presente en informes de tasación B2B (`general-price`)*:
   - `vehicleAge`: Edad del vehículo calculada en años.
   - `vehicleOdometer`: Kilometraje evaluado en kilómetros (km).
   - `series`: Serie de distribución de cuantiles de kilometraje por edad del vehículo (`UsageAgePoint[]`).
   - `source`: Procedencia y versión de la curva de uso.
   - `vehicleAgeComparable`: Indica si el vehículo está dentro del rango de comparabilidad estadística.
   - `totalSampleSize`: Tamaño total de muestra analizada.

---

### Ejemplo Completo de Respuesta: Producto `general-price` (B2B)

Este es un ejemplo real del resultado devuelto para un pedido del producto B2B (`PRICE_API`), que incluye las secciones `price`, `comparables` y `usage`:

```json
{
  "orderId": "ordb2b_01j7x000000000000000000000",
  "reportType": "general-price",
  "status": "COMPLETED",
  "saleId": "sal_01j7x000000000000000000000",
  "result": {
    "schemaVersion": "report-result-v2",
    "localization": {
      "locale": "es-CL",
      "timeZone": "America/Santiago",
      "dateFormat": "dd-MM-yyyy",
      "distanceUnit": "km",
      "currency": {
        "code": "CLP",
        "name": "Peso chileno",
        "symbol": "$",
        "symbolPosition": "BEFORE",
        "decimals": 0,
        "decimalSeparator": ",",
        "groupSeparator": "."
      }
    },
    "vehicle": {
      "mark": "Toyota",
      "model": "Yaris",
      "year": 2021,
      "version": "1.5",
      "canonicalVersion": "1.5 XLS",
      "versionResolution": "MATCHED",
      "versionApplied": true
    },
    "resolution": {
      "catalogVersion": "cat-2026-v1",
      "sourceCatalogVersion": "cat-2026-v1",
      "referenceYear": 2026,
      "fields": {
        "model": {
          "value": "Yaris",
          "source": "EXACT"
        },
        "version": {
          "value": "1.5",
          "source": "EXACT"
        },
        "region": {
          "value": "13",
          "source": "EXACT"
        },
        "odometer": {
          "value": 50000,
          "source": "PROVIDED"
        }
      },
      "selected": {
        "model": "Yaris",
        "version": "1.5",
        "confidence": 95,
      },
      "alternatives": []
    },
    "sections": {
      "price": {
        "schema": "price-v2",
        "status": "AVAILABLE",
        "data": {
          "qualityScore": 85,
          "qualityInputs": {
            "publicationCount": 45,
            "support": 0.95,
            "effectiveWeight": 38.2,
            "lowConfidence": false,
            "converged": true,
            "crossingsCorrected": 0
          },
          "marketContext": {
            "requestedRegion": "13",
            "appliedRegion": "13",
            "isNationalReference": false,
            "odometer": 50000
          },
          "purchase": {
            "minPrice": 9800000,
            "maxPrice": 10500000
          },
          "sale": {
            "minPrice": 11800000,
            "maxPrice": 12400000
          },
          "grossMarginEstimate": {
            "disclaimer": "Diferencial de mercado antes de reacondicionamiento, tiempo en patio, financiamiento e impuestos.",
            "purchaseRange": {
              "minPrice": 9800000,
              "maxPrice": 10500000
            },
            "saleRange": {
              "minPrice": 11800000,
              "maxPrice": 12400000
            },
            "minGrossMargin": 1300000,
            "minGrossMarginPercent": 10.48,
            "maxGrossMargin": 2600000,
            "maxGrossMarginPercent": 20.97,
            "avgGrossMargin": 1950000,
            "avgGrossMarginPercent": 16.12
          },
          "priceDistribution": {
            "market": [
              {
                "percentile": 10,
                "price": 9200000
              },
              {
                "percentile": 20,
                "price": 9800000
              },
              {
                "percentile": 25,
                "price": 10000000
              },
              {
                "percentile": 30,
                "price": 10200000
              },
              {
                "percentile": 40,
                "price": 10500000
              },
              {
                "percentile": 50,
                "price": 11000000
              },
              {
                "percentile": 60,
                "price": 11400000
              },
              {
                "percentile": 70,
                "price": 11800000
              },
              {
                "percentile": 75,
                "price": 12100000
              },
              {
                "percentile": 80,
                "price": 12400000
              },
              {
                "percentile": 90,
                "price": 13000000
              }
            ],
            "private": [
              {
                "percentile": 10,
                "price": 9000000
              },
              {
                "percentile": 20,
                "price": 9600000
              },
              {
                "percentile": 25,
                "price": 9800000
              },
              {
                "percentile": 30,
                "price": 10000000
              },
              {
                "percentile": 40,
                "price": 10300000
              },
              {
                "percentile": 50,
                "price": 10800000
              },
              {
                "percentile": 60,
                "price": 11200000
              },
              {
                "percentile": 70,
                "price": 11600000
              },
              {
                "percentile": 75,
                "price": 11900000
              },
              {
                "percentile": 80,
                "price": 12200000
              },
              {
                "percentile": 90,
                "price": 12800000
              }
            ],
            "dealer": [
              {
                "percentile": 10,
                "price": 9400000
              },
              {
                "percentile": 20,
                "price": 10000000
              },
              {
                "percentile": 25,
                "price": 10200000
              },
              {
                "percentile": 30,
                "price": 10400000
              },
              {
                "percentile": 40,
                "price": 10700000
              },
              {
                "percentile": 50,
                "price": 11200000
              },
              {
                "percentile": 60,
                "price": 11600000
              },
              {
                "percentile": 70,
                "price": 12000000
              },
              {
                "percentile": 75,
                "price": 12300000
              },
              {
                "percentile": 80,
                "price": 12600000
              },
              {
                "percentile": 90,
                "price": 13200000
              }
            ]
          },
          "freshness": {
            "lastValidLogicalDay": "2026-11-01",
            "ageDays": 1,
            "status": "FRESH"
          },
          "methodology": {
            "qualityVersion": "quality-v2",
            "smoothingVersion": "wh-v1",
            "algorithmVersion": "2026.1"
          }
        }
      },
      "comparables": {
        "schema": "comparables-v1",
        "status": "AVAILABLE",
        "data": {
          "items": [
            {
              "portal": "chileautos",
              "publicationId": "pub-yaris-101",
              "url": "https://example.com/autos/pub-yaris-101",
              "price": 11990000,
              "year": 2021,
              "odometer": 48000,
              "version": "1.5",
              "canonicalVersionKey": "1.5",
              "region": "13",
              "sellerType": "dealer",
              "firstSeenAt": "2026-10-15T12:00:00Z",
              "lastSeenAt": "2026-11-01T10:00:00Z",
              "distant": false,
              "diff": {
                "yearDelta": 0,
                "odometerDelta": -2000,
                "sameVersion": true,
                "sameRegion": true
              }
            },
            {
              "portal": "chileautos",
              "publicationId": "pub-yaris-102",
              "url": "https://example.com/autos/pub-yaris-102",
              "price": 11500000,
              "year": 2020,
              "odometer": 55000,
              "version": "1.5",
              "canonicalVersionKey": "1.5",
              "region": "05",
              "sellerType": "private",
              "firstSeenAt": "2026-10-10T09:30:00Z",
              "lastSeenAt": "2026-10-28T18:00:00Z",
              "distant": true,
              "diff": {
                "yearDelta": -1,
                "odometerDelta": 5000,
                "sameVersion": true,
                "sameRegion": false
              }
            }
          ],
          "model": {
            "algorithmVersion": "2026.1",
            "logicalDay": "2026-11-01",
            "scope": "regional"
          },
          "selection": {
            "candidates": 15,
            "withinTolerance": 8,
            "maxResults": 10,
            "kMin": 3
          }
        }
      },
      "usage": {
        "schema": "usage-v1",
        "status": "AVAILABLE",
        "data": {
          "markKey": "toyota",
          "modelKey": "yaris",
          "markCanon": "Toyota",
          "modelCanon": "Yaris",
          "vehicleAge": 5,
          "vehicleOdometer": 50000,
          "series": [
            {
              "age": 5,
              "referenceYear": 2021,
              "distribution": [
                {
                  "percentile": 25,
                  "odometer": 42000
                },
                {
                  "percentile": 50,
                  "odometer": 52000
                },
                {
                  "percentile": 75,
                  "odometer": 65000
                }
              ],
              "synthetic": false,
              "sampleSize": 45,
              "sampleSizeRaw": 48,
              "discardedOutliers": 3,
              "lowerFence": 15000,
              "upperFence": 95000
            }
          ],
          "source": {
            "schemaVersion": "usage-curves-v1",
            "country": "CL",
            "generatedAt": "2026-11-01T06:00:00Z"
          },
          "vehicleAgeComparable": true,
          "maxComparableAge": 15,
          "totalSampleSize": 45
        }
      }
    }
  }
}
```

---

## Migración de 4.x a 5.0

La versión 5.0 concentra la confianza de selección en `versionConfidence` y `versionBasis`. Los cambios incompatibles son:

| En 4.x | En 5.0 |
|---|---|
| `certainty`, `topMargin` y `score` en resolución, inferencias y candidatos | Eliminados de los tipos públicos y de las respuestas documentadas; usa `versionConfidence`, `versionBasis` y `confidence` de las alternativas |
| `TrimInferenceResult.outcome` incluye `no_evidence` | Solo `matched` o `no_match`; un resultado elegido por el mercado es `matched` y su confianza explica la certeza |
| `versionConfidence` y `versionBasis` opcionales en un resultado `matched` | Obligatorios cuando `outcome` es `matched`; ausentes con `no_match` |
| `createFromTrimText` acepta `minConfidence` numérico | Se elimina; usa `minVersionConfidence` (`EXACT` > `HIGH` > `MEDIUM` > `LOW`), cuyo valor por defecto es `MEDIUM` |
| `order.result.resolution` permite `certainty` y `topMargin` | `ResultResolution` ya no tipa esos campos; la confianza de versión se consulta en `order.resolution` |

`createFromTrimText` ahora acepta resultados `matched` con confianza `MEDIUM` por defecto. Lanza `TrimInferenceError` solo para `no_match` o si `versionConfidence` queda bajo el mínimo configurado.

## Migración de 3.x a 4.0

La versión 4.0 alinea los tipos con lo que la API entrega. Los cambios incompatibles son:

| En 3.x | En 4.0 |
|---|---|
| `order.result.data.sections`, `order.result.data.vehicle`, `order.result.data.resolution` | `order.result.sections`, `order.result.vehicle`, `order.result.resolution` (el resultado se entrega directamente en `order.result`; el tipo `OrderResultData` ya no existe) |
| `resolution.fields.odometer` (a nivel de pedido y en `catalog.resolveVehicle`) | `resolution.fields.odometerKm` (obligatorio) |
| `order.result.resolution` con el tipo `Resolution` | `order.result.resolution` con el tipo `ResultResolution`: el kilometraje va en `fields.odometer` y no incluye `versionConfidence` ni `versionBasis` (estos viajan en `order.resolution`) |
| `OrderStatus.pollAfterMs` | Eliminado: la consulta de estado no lo informa; el intervalo sugerido llega solo en la aceptación (`OrderAcceptance.pollAfterMs`) |
| Secciones `listingAnalysis` y `priceHistory` | Eliminadas: el producto de tasación entrega `price`, `comparables` y `usage`. Una sección futura sigue accesible por la firma de índice abierta de `ReportSections` |
| `OrderResultVehicle.versionResolution` obligatorio | Opcional |

Además, `versionConfidence` admite `EXACT` y `versionBasis` admite `MOST_COMMON`.

## Migración de 2.x a 3.0

La versión 3.0 del SDK actualiza el formato del resultado de tasación desde el esquema monolítico (`general-price-result-v1`) hacia una arquitectura desacoplada de secciones modulares (`report-result-v2`).

### 1. Principales Cambios de Arquitectura

- **Curva única de mercado:** La compra (P20–P40) y la venta (P70–P80) se calculan sobre una sola distribución de mercado, en lugar de contrastar particulares contra automotoras. Las distribuciones particulares y automotoras se mantienen únicamente como referencia visual.
- **Secciones modulares con ciclo de vida propio:** Los datos residen bajo `order.result.sections`. Cada sección declara su propio estado (`AVAILABLE`, `UNAVAILABLE`, `FAILED`) y `data` se omite si no se generó.
- **Sin unidades en nombres:** De acuerdo a las convenciones estándar, montos y kilometrajes se exponen como números sin unidades en el nombre (ej: `odometer` y `price`, en lugar de `odometerKm` o `priceCLP`).
- **Margen bruto descriptivo:** `grossMarginEstimate` expone rangos de compra, rangos de venta, utilidades monetarias y porcentajes, sin exponer percentiles internos.

### 2. Tabla de Mapeo de Propiedades

| Propiedad en SDK 2.x (`general-price-result-v1`) | Equivalente en SDK 3.0 (`report-result-v2`) |
|---|---|
| `order.result.schemaVersion === "general-price-result-v1"` | `order.result.schemaVersion === "report-result-v2"` |
| `order.result.data.marketContext.*` | `order.result.sections.price.data.marketContext.*` |
| `order.result.data.marketContext.odometerKm` | `order.result.sections.price.data.marketContext.odometer` (y `resolution.fields.odometer.value`) |
| `order.result.data.purchase` / `data.sale` | `order.result.sections.price.data.purchase` / `sale` (como rangos `{minPrice, maxPrice}`) |
| `order.result.data.grossMarginEstimate` | `order.result.sections.price.data.grossMarginEstimate` |
| `order.result.data.freshness` | `order.result.sections.price.data.freshness` |
| `order.result.data.methodology` | `order.result.sections.price.data.methodology` |
| `order.result.data.comparables.items` | `order.result.sections.comparables.data.items` |
| `comparables.availability` | Pasa al `status` de la sección (`AVAILABLE`, `UNAVAILABLE`, `FAILED`) |
| `item.priceCLP` | `item.price` (en CLP) |
| `item.odometerKm` | `item.odometer` (en km) |
| `item.distant: boolean` | `item.distant: boolean` (conservado como flag booleano en cada ítem) |
| *(nuevos)* | `localization`, `sections.price.data.qualityScore`, `sections.price.data.priceDistribution`, `sections.usage` |

### 3. Paridad Completa entre SDK Moderno y Legacy

A partir de la versión 3.0.0, tanto `@autotia/vehicle-valuation-sdk` como `@autotia/vehicle-valuation-sdk-legacy` implementan exactamente los mismos contratos, tipos y secciones, cerrando la brecha histórica en la que el cliente legacy no exponía comparables.

---

## Manejo de Errores

Todos los errores del SDK heredan de la clase base `AutotiaError`, facilitando la captura estructurada de códigos de error y trazabilidad:

```js
const {
  AutotiaError,
  BadRequestError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  QuotaExceededError,
  RateLimitError,
  InternalServerError,
  AutotiaConnectionError,
  WaiterTimeoutError,
  OrderFailedError,
  TrimInferenceError,
} = require("@autotia/vehicle-valuation-sdk-legacy");

async function run() {
  try {
    await client.orders.create({
      reportType: "general-price",
      mark: "Toyota",
      model: "Yaris",
      year: 2021,
      version: "1.5",
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      console.warn("Límite de tasa excedido. Reintentar después de: " + err.retryAfter);
    } else if (err instanceof QuotaExceededError) {
      console.error("Tu cuota comercial contratada ha sido consumida.");
    } else if (err instanceof AutotiaError) {
      console.error("Error de Autotia [" + err.code + "]: " + err.message + " (Request ID: " + err.apiRequestId + ")");
    }
  }
}
```

---

## Compatibilidad de Runtimes

- **Node.js 11.15 a 22.11** (CommonJS, sintaxis ES2018).
- Probado contra el contenedor oficial `node:11.15.0-alpine`.
- Para proyectos modernos basados en Node.js 22.12 o superior con soporte ESM nativo, utilizar [`@autotia/vehicle-valuation-sdk`](https://github.com/autotia/vehicle-valuation-sdk-node).

## Licencia

[MIT](LICENSE)
