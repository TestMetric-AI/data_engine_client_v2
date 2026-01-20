# Listado de Clientes Exonerados

Este endpoint permite listar los registros de la tabla `client_exonerated`
con paginacion.

## Endpoint

- Metodo: `GET`
- Ruta: `/client-exonerated`
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
curl "http://localhost:3000/client-exonerated?page=1&pageSize=50"
```
