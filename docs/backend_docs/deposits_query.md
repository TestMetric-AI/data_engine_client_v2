# Consulta de Depositos DP10

Este endpoint permite consultar la tabla `deposits_dp10` por parametros y
devuelve un solo resultado si existe coincidencia.

## Endpoint

- Metodo: `GET`
- Ruta: `/deposits/query`
- Formato: `query string`

## Parametros soportados

Filtros exactos (coincidencia por igualdad):

- `NUMERO_CONTRATO`
- `NUM_PRODUCTO`
- `ID_PRODUCTO`
- `ID_CUSTOMER`
- `MONEDA`
- `PLAZO`
- `ESTADO_PRODUCTO`

Filtros de fecha:

- `FECHA_NEGOCIACION_HASTA` (formato `YYYY-MM-DD`)
- `FECHA_EFECTIVA_DESDE` y `FECHA_EFECTIVA_HASTA` (formato `YYYY-MM-DD`)

Notas:

- Debe enviarse al menos un parametro.
- `FECHA_EFECTIVA` requiere ambos extremos (DESDE y HASTA).
- `FECHA_NEGOCIACION_HASTA` filtra con `<=`.

El resultado incluye la columna `EXONERATED` cuando exista en la tabla.

## Respuestas

- `200`: retorna `{ data: { ... } }` con un resultado.
- `404`: no se encontro ningun resultado.
- `400`: parametros invalidos o faltantes.
- `500`: error interno al consultar.

## Ejemplo con curl

```bash
curl "http://localhost:3000/deposits/query?NUMERO_CONTRATO=123456"
```

Con rango de fechas:

```bash
curl "http://localhost:3000/deposits/query?FECHA_EFECTIVA_DESDE=2026-03-01&FECHA_EFECTIVA_HASTA=2026-03-31&MONEDA=USD"
```
