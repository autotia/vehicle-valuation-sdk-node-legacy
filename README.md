# @autotia/vehicle-valuation-sdk-legacy

Versión CommonJS del SDK de tasación vehicular de Autotia, para Node.js 11.15 a 22.11. En Node.js 22.12 o superior,
usa [`@autotia/vehicle-valuation-sdk`](https://github.com/autotia/vehicle-valuation-sdk-node).

## ¿Qué paquete necesito?

| Tu entorno | Paquete |
|---|---|
| Node.js 22.12 o superior | [`@autotia/vehicle-valuation-sdk`](https://github.com/autotia/vehicle-valuation-sdk-node) |
| Node.js 11.15 a 22.11 | `@autotia/vehicle-valuation-sdk-legacy` (este repositorio) |

Ambos paquetes ofrecen la misma API y el mismo comportamiento. Las únicas diferencias están en
[Diferencias con el paquete moderno](#diferencias-con-el-paquete-moderno).

## Instalación

```bash
npm install @autotia/vehicle-valuation-sdk-legacy
```

El paquete es CommonJS y no tiene dependencias.

## Uso rápido

```js
const { VehicleValuationClient } = require("@autotia/vehicle-valuation-sdk-legacy");

const client = new VehicleValuationClient({
  clientId: process.env.AUTOTIA_CLIENT_ID,
  clientSecret: process.env.AUTOTIA_CLIENT_SECRET,
  environment: "prod", // o "dev"
});

async function main() {
  const acceptance = await client.orders.create({
    reportType: "general-price",
    mark: "Toyota",
    model: "Yaris",
    year: 2020,
    version: "1.5",
    odometerKm: 50000,
  });

  const order = await client.orders.waitUntilComplete(acceptance.orderId);
  console.log(order.result);
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
```

La tasación es asíncrona: `create` la solicita y `waitUntilComplete` consulta su estado respetando el intervalo
que indica la API, hasta que termina o vence el plazo.

## Recursos

| Método | Descripción |
|---|---|
| `client.orders.create(input, options?)` | Solicita un pedido de tasación entregando la versión exacta. |
| `client.orders.createFromTrimText(input, options?)` | Infiere la versión a partir de texto libre y solicita la tasación. |
| `client.orders.get(orderId, options?)` | Consulta el estado de un pedido. |
| `client.orders.waitUntilComplete(orderId, options?)` | Espera y devuelve el estado terminal (`COMPLETED` o lanza `OrderFailedError`). |
| `client.catalog.inferTrim(input, options?)` | Infiere las versiones del catálogo a partir de marca, modelo, año y texto libre. |
| `client.catalog.listMarks(options?)` | Lista las marcas del catálogo. |
| `client.catalog.listModels(mark, options?)` | Lista los modelos de una marca. |
| `client.catalog.listYears(mark, model, options?)` | Lista los años disponibles de un modelo. |
| `client.catalog.listTrims(mark, model, year, options?)` | Lista las versiones disponibles para un año y modelo. |

Todo método acepta `timeoutMs`, `maxRetries` y `signal` en sus opciones. El cliente acepta `timeoutMs` y `maxRetries` por defecto; los fallos transitorios se reintentan hasta dos veces con backoff exponencial y full jitter. `401` fuerza una sola renovación del token.

`waitUntilComplete` espera hasta 120 segundos por defecto; acepta `timeoutMs` para cambiar ese plazo y `pollAfterMs` para fijar el intervalo inicial. Después de `create`, el cliente conserva el intervalo devuelto para usarlo automáticamente en `waitUntilComplete`. El GET de estado no incluye `pollAfterMs`.

Los métodos del catálogo aceptan `ifNoneMatch` para enviar `If-None-Match`. Si el servicio responde `304 Not Modified`, el método devuelve `null`; de lo contrario devuelve el objeto de catálogo contenido en `data`.

El cliente requiere `environment: "dev" | "prod"` o ambas opciones `baseUrl` y `tokenUrl`. También puede recibir `scopes` para restringir el token. Si usas `tokenProvider`, se omiten `clientId` y `clientSecret`. `transport` es una opción para integrar transportes propios y pruebas.

## Tasación a partir de texto libre

Cuando no se conoce de antemano la versión normalizada del catálogo oficial, se puede solicitar la tasación directamente a partir de una descripción en texto libre mediante `createFromTrimText`:

```js
const {
  VehicleValuationClient,
  TrimInferenceError,
} = require("@autotia/vehicle-valuation-sdk-legacy");

async function main() {
  const client = new VehicleValuationClient({
    clientId: process.env.AUTOTIA_CLIENT_ID,
    clientSecret: process.env.AUTOTIA_CLIENT_SECRET,
    environment: "prod",
  });

  try {
    const result = await client.orders.createFromTrimText(
      {
        reportType: "general-price",
        mark: "Toyota",
        model: "Yaris",
        year: 2020,
        trimText: "1.5 GL sedan mecanico",
        odometerKm: 50000,
      },
      {
        minConfidence: 60, // Opcional: umbral mínimo de preferencia (0-100)
      },
    );

    console.log("Versión seleccionada:", result.selectedVersion);
    console.log(
      "Preferencia calculada:",
      result.inference.versions[0]
        ? result.inference.versions[0].confidence + "%"
        : "N/A",
    );

    const completed = await client.orders.waitUntilComplete(
      result.order.orderId,
    );
    console.log(completed.result);
  } catch (error) {
    if (error instanceof TrimInferenceError) {
      // El texto no aportó evidencia, contradice el catálogo o no alcanzó minConfidence
      console.warn(
        "Inferencia no concluyente (" +
          error.outcome +
          "). Opciones disponibles:",
        error.versions,
      );
    } else {
      throw error;
    }
  }
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
```

### Semántica de `confidence`

El campo `confidence` devuelto en cada versión inferida representa la **preferencia relativa entre los candidatos evaluados** y suma 100 sobre el conjunto completo de versiones analizadas; no es una probabilidad estadística de acierto. Si un solo candidato resulta compatible con el texto, su `confidence` es 100.

## Autenticación

El SDK obtiene y renueva el token OAuth2 (`client_credentials`) automáticamente y lo reutiliza mientras está
vigente.

**`clientSecret` es una credencial de servidor.** Nunca la incluyas en código que se ejecute en un navegador o en
una app móvil. Si tu plataforma ya administra tokens, usa la opción `tokenProvider` en lugar de `clientSecret`.

## Idempotencia

`orders.create` envía siempre un header `Idempotency-Key`. Si no entregas uno, el SDK genera un UUID. Para que
un reintento de tu propio proceso no genere un segundo pedido, entrega una clave estable de tu negocio:

```js
await client.orders.create(input, { idempotencyKey: "order-123-valuation-1" });
```

## Errores

Todos los errores heredan de `AutotiaError`, que expone `status`, `code`, `apiRequestId`, `executionId` y `cause`. Incluye
`apiRequestId` cuando contactes a soporte.

| Error | Cuándo ocurre | ¿El SDK reintenta? |
|---|---|---|
| `BadRequestError` | Solicitud inválida (400). | No |
| `AuthenticationError` | Credenciales inválidas o token rechazado (401). | Una vez, renovando el token |
| `PermissionDeniedError` | Cliente sin permiso o suspendido (403). | No |
| `NotFoundError` | Vehículo, marca, modelo o año inexistente (404). | No |
| `ConflictError` | La `Idempotency-Key` ya se usó con otra solicitud (409). | No |
| `UnprocessableEntityError` | No hay datos suficientes para tasar (422). | No |
| `QuotaExceededError` | Se agotó la cuota contratada (429). | No |
| `RateLimitError` | Demasiadas solicitudes por segundo (429). | Sí, con espera exponencial |
| `InternalServerError` | Servicio no disponible o tiempo agotado (503, 504). | Sí, con espera exponencial |
| `AutotiaConnectionError` | Falla de red, DNS o conexión. | Sí, con espera exponencial |
| `WaiterTimeoutError` | `waitUntilComplete` superó su plazo. | No |
| `OrderFailedError` | El pedido terminó con error. | No |
| `TrimInferenceError` | La inferencia de versión no aportó evidencia, contradice el catálogo o no alcanzó `minConfidence`. | No |

## Diferencias con el paquete moderno

- **Cancelación:** Node.js 11 no tiene `AbortController`. La opción `signal` es opcional y acepta cualquier objeto
  con la forma de `AbortSignal`. Para acotar una llamada, usa `timeoutMs`.
- **Errores:** la causa original se expone en la propiedad `cause` del error.

## Compatibilidad

- Node.js 11.15.0 o superior. Se prueba en Node.js 11.15 y 22.
- El paquete no tiene fecha de retiro: se mantiene mientras sus pruebas pasen en Node.js 11.15.
- Node.js 11 trae certificados raíz de 2019. Si la conexión TLS falla por un certificado desconocido, agrega los
  certificados raíz actuales con la variable de entorno de Node.js `NODE_EXTRA_CA_CERTS`. Nunca desactives la
  verificación TLS.

## Licencia

[MIT](LICENSE)

## Publicación (mantenedores)

La publicación se realiza automáticamente mediante GitHub Actions (`publish.yml`) al crear un tag `v<version>` sobre la rama `main`. La primera publicación ya se realizó; el workflow publica solo con trusted publishing y no usa tokens npm.

Para configurar o reconfigurar la publicación:
- En GitHub, se requiere el environment `npm` con permiso para los tags `v*`.
- En npmjs.com, se requiere configurar Trusted Publisher para la organización `autotia`, repositorio correspondiente, workflow `publish.yml`, environment `npm` y la opción "Allow npm publish" habilitada.
- El workflow de GitHub Actions requiere Node.js 24 y npm 11.5.1 o superior (instala npm 11.15.0).

El flujo estándar de publicación es el siguiente:

1. Llevar los cambios aprobados desde `dev` hacia `main` (mediante Pull Request y merge).
2. Crear y enviar el tag de versión (por ejemplo `v1.0.1`) sobre `main`.
3. El workflow en GitHub Actions publica en npm utilizando autenticación de confianza (Trusted Publishing con OIDC) y procedencia verificable (provenance).
4. Las versiones estables (sin sufijo de pre-versión) se publican con el dist-tag `latest`. Las versiones con sufijo (como `-beta.N`) se publican con el dist-tag `next`.
