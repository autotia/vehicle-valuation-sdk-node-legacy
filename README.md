# @autotia/vehicle-valuation-sdk-legacy

Versión CommonJS del SDK de tasación vehicular de Autotia, para Node.js 11.15 a 22.11. En Node.js 22.12 o superior,
usa [`@autotia/vehicle-valuation-sdk`](https://github.com/autotia/vehicle-valuation-sdk-node).

> **Estado: en desarrollo.** Todavía no está publicado en npm. La API pública descrita aquí puede cambiar antes
> de la versión 1.0.0.

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
  const acceptance = await client.valuations.create({
    mark: "Toyota",
    model: "Yaris",
    year: 2020,
    version: "1.5",
    odometerKm: 50000,
  });

  const valuation = await client.valuations.waitUntilComplete(acceptance.valuationId);
  console.log(valuation.result);
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
| `client.valuations.create(input, options?)` | Solicita una tasación. |
| `client.valuations.get(valuationId, options?)` | Consulta el estado de una tasación. |
| `client.valuations.waitUntilComplete(valuationId, options?)` | Espera y devuelve el estado terminal (`COMPLETED` o lanza `ValuationFailedError`). |
| `client.catalog.listMarks(options?)` | Lista las marcas del catálogo. |
| `client.catalog.listModels(...)`, `client.catalog.listYears(...)`, ... | Recorren el catálogo de modelos, años y versiones. |

Todo método acepta `timeoutMs`, `maxRetries` y `signal` en sus opciones. El cliente acepta `timeoutMs` y `maxRetries` por defecto; los fallos transitorios se reintentan hasta dos veces con backoff exponencial y full jitter. `401` fuerza una sola renovación del token.

`waitUntilComplete` espera hasta 120 segundos por defecto; acepta `timeoutMs` para cambiar ese plazo y `pollAfterMs` para fijar el intervalo inicial. Después de `create`, el cliente conserva el intervalo devuelto para usarlo automáticamente en `waitUntilComplete`. El GET de estado no incluye `pollAfterMs`.

Los métodos del catálogo aceptan `ifNoneMatch` para enviar `If-None-Match`. Si el servicio responde `304 Not Modified`, el método devuelve `null`; de lo contrario devuelve el objeto de catálogo contenido en `data`.

El cliente requiere `environment: "dev" | "prod"` o ambas opciones `baseUrl` y `tokenUrl`. También puede recibir `scopes` para restringir el token. Si usas `tokenProvider`, se omiten `clientId` y `clientSecret`. `transport` es una opción para integrar transportes propios y pruebas.

## Autenticación

El SDK obtiene y renueva el token OAuth2 (`client_credentials`) automáticamente y lo reutiliza mientras está
vigente.

**`clientSecret` es una credencial de servidor.** Nunca la incluyas en código que se ejecute en un navegador o en
una app móvil. Si tu plataforma ya administra tokens, usa la opción `tokenProvider` en lugar de `clientSecret`.

## Idempotencia

`valuations.create` envía siempre un header `Idempotency-Key`. Si no entregas uno, el SDK genera un UUID. Para que
un reintento de tu propio proceso no genere una segunda tasación, entrega una clave estable de tu negocio:

```js
await client.valuations.create(input, { idempotencyKey: "order-123-valuation-1" });
```

## Errores

Todos los errores heredan de `AutotiaError`, que expone `status`, `code`, `apiRequestId`, `executionId` y `cause`. Incluye
`apiRequestId` cuando contactes a soporte.

| Error | Cuándo ocurre | ¿El SDK reintenta? |
|---|---|---|
| `BadRequestError` | Solicitud inválida (400). | No |
| `AuthenticationError` | Credenciales inválidas o token rechazado (401). | Una vez, renovando el token |
| `PermissionDeniedError` | Cliente sin permiso o suspendido (403). | No |
| `NotFoundError` | Vehículo, marca o modelo inexistente (404). | No |
| `ConflictError` | La `Idempotency-Key` ya se usó con otra solicitud (409). | No |
| `UnprocessableEntityError` | No hay datos suficientes para tasar (422). | No |
| `QuotaExceededError` | Se agotó la cuota contratada (429). | No |
| `RateLimitError` | Demasiadas solicitudes por segundo (429). | Sí, con espera exponencial |
| `InternalServerError` | Servicio no disponible o tiempo agotado (503, 504). | Sí, con espera exponencial |
| `AutotiaConnectionError` | Falla de red, DNS o conexión. | Sí, con espera exponencial |
| `WaiterTimeoutError` | `waitUntilComplete` superó su plazo. | No |
| `ValuationFailedError` | La tasación terminó con error. | No |

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

La publicación se ejecuta al enviar un tag `v<version>` cuyo commit pertenece a `main`. Antes de crear el tag,
actualiza `version` en `package.json` y asegúrate de que coincida exactamente con el tag.

En GitHub, crea el environment `npm` y permite en él los tags `v*`. En npm, cuando el paquete ya exista, configura
Trusted Publisher para este repositorio y el workflow `publish.yml`, con el environment `npm`. El workflow necesita
Node.js 24 y npm 11.5.1 o superior para publicar mediante OIDC.

Para la primera publicación, el paquete aún no puede tener Trusted Publisher configurado. Agrega temporalmente el
secreto `NPM_BOOTSTRAP_TOKEN` al environment `npm`; el workflow lo usará para publicar con provenance. Inmediatamente
después de configurar Trusted Publisher para el paquete en npm, elimina ese secreto de GitHub y realiza una
publicación con OIDC dentro de los dos días siguientes para validar la configuración.
