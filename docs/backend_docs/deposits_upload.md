# Carga de Depositos DP10

Este endpoint permite cargar archivos CSV con la estructura de
`docs/data_example/deposits.20260304.csv` y guardarlos en DuckDB.

## Endpoint

- Metodo: `POST`
- Ruta: `/uploads/deposits`
- Formato: `multipart/form-data`
- Campo de archivo: `file`
- Parametro opcional: `overwrite=true|false` (query)
- Parametro opcional: `DEPOSITS_ENRICHMENT_ENABLED=false` (env, desactiva enriquecimiento)

## Validaciones

- Nombre del archivo: `deposits.20260304` o `deposits.20260304.csv`
- Columnas: deben coincidir en nombre y orden con la tabla `deposits_dp10`
- Tipos:
  - Montos y tasas: numeros decimales
  - Fechas (YYYYMMDD): `FECHA_EFECTIVA`, `FECHA_VENCIMIENTO`, `FECHA_ULT_RENOVACION`,
    `FECHA_PROX_RENOVACION`, `FECHA_PROXIMO_PAGO`, `FECHA_ULT_MOVIMIENTO`,
    `FECHA_CANCELACION`, `FECHA_ORIG_CONTRATO`
  - Fechas (YYMMDDHHMM): `FECHA_NEGOCIACION`, `FECHA_REG_APERTURA`,
    `FECHA_APROBO_APERTURA`, `FECHA_SOLICITUD_EXONERACION`,
    `FECHA_APROBO_EXONERACION`, `FECHA_REG_CANCELACION`, `FECHA_APR_CANCELACION`
- Enumerados: `TIENE_SOLICITUD_EXONERACION` en `SI` o `NO`
- Normalizacion de fechas: `YYYYMMDD` y `YYMMDDHHMM` se guardan como `YYYY-MM-DD`

## Tabla destino

Nombre:

- `deposits_dp10`

Se crea automaticamente si no existe. Los campos numericos se almacenan como
DECIMAL y el resto como VARCHAR.

Columnas adicionales:

- `LEGAL_ID`
- `LEGAL_DOC`
- `EXONERATED`

`EXONERATED` se actualiza en segundo plano comparando `LEGAL_ID` contra
`client_exonerated.NUMBER_PERSONAL_ID`.

Estas columnas se alimentan en segundo plano usando `fetchClient` (T24) con
`ID_CUSTOMER` como parametro. El upload no espera este proceso.

## Ejemplo con curl

```bash
curl -X POST http://localhost:3000/uploads/deposits \
  -F "file=@docs/data_example/deposits.20260304.csv"
```

Para reescribir la tabla:

```bash
curl -X POST "http://localhost:3000/uploads/deposits?overwrite=true" \
  -F "file=@docs/data_example/deposits.20260304.csv"
```

Respuesta esperada:

```json
{
  "message": "Archivo cargado correctamente.",
  "inserted": 100
}
```
