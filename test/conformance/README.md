# Formato de conformidad

`fixtures.json` es un archivo JSON plano que puede leerse con `JSON.parse` en Node.js 11.15. Cada caso contiene la solicitud, una o más respuestas HTTP (status, headers relevantes y body) o un fallo de transporte, y el resultado esperado del SDK.

`expected.kind` vale `value` o `error`. Los errores indican clase pública y `code`; `retry` indica si reintenta, el máximo de reintentos y, cuando corresponde, la estrategia. `contractStatus` identifica respuestas documentadas por el catálogo de errores que el handler actual no emite.
