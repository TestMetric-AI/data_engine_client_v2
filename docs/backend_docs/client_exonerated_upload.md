# Carga de Clientes Exonerados

Este endpoint permite cargar archivos XLSX con la estructura de
`docs/data_example/clientes_exonerados.xlsx` y guardarlos en DuckDB.

## Endpoint

- Metodo: `POST`
- Ruta: `/uploads/client-exonerated`
- Formato: `multipart/form-data`
- Campo de archivo: `file`
- Parametro opcional: `overwrite=true|false` (query)

## Validaciones

- Nombre del archivo: `clientes_exonerados.xlsx`
- Encabezados: deben coincidir en nombre y orden con el archivo de ejemplo

## Tabla destino

Nombre:

- `client_exonerated`

Columnas:

- `TRANSACTION_REF`
- `NOMBRE_CLIENTE`
- `TYPE_PERSONAL_ID`
- `NUMBER_PERSONAL_ID`
- `DATE_INCLUSION`

## Normalizacion

- `TRANSACTION_REF` y `NUMBER_PERSONAL_ID`: se eliminan espacios internos.
- `NOMBRE_CLIENTE` y `TYPE_PERSONAL_ID`: se normalizan espacios y se convierten a mayusculas.

## Ejemplo con curl

```bash
curl -X POST http://localhost:3000/uploads/client-exonerated \
  -F "file=@docs/data_example/clientes_exonerados.xlsx"
```

Para reescribir la tabla:

```bash
curl -X POST "http://localhost:3000/uploads/client-exonerated?overwrite=true" \
  -F "file=@docs/data_example/clientes_exonerados.xlsx"
```
