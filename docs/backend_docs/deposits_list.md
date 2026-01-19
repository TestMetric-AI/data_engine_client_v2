# Listado de Depositos DP10

Este endpoint permite listar los registros de la tabla `deposits_dp10`
con paginacion.

## Endpoint

- Metodo: `GET`
- Ruta: `/deposits`
- Formato: `query string`

## Parametros de paginacion

- `page`: numero de pagina (entero >= 1). Default `1`.
- `pageSize`: tamano de pagina (entero >= 1). Default `100`.
  Maximo `500`.

## Respuesta

- `200`: retorna `{ data: [...], pagination: { page, pageSize, total, totalPages } }`.
- `400`: parametros invalidos.
- `500`: error interno al consultar.

## Ejemplo con curl

```bash
curl "http://localhost:3000/deposits?page=1&pageSize=50"
```
