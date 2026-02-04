# API Documentation

Reference guide for integrating external services with the Data Engine.

## Authentication

All API endpoints are protected. You must include a valid API Token in the `Authorization` header of your requests.

> **⚠️ Protected Information**
> Keep your API Tokens secure. Do not share them in public repositories.

### Authorization Header

```http
Authorization: Bearer <YOUR_TOKEN>
```

---

## Token Generation

### Generate API Token (Admin Only)

Create a new long-lived API Token.

- **URL**: `/api/admin/tokens`
- **Method**: `POST`
- **Auth**: Requires Admin Session (Dashboard)
- **Content-Type**: `application/json`

**Parameters (Body):**

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | string | **Yes** | Description name for the token |
| `expiresIn` | string | No | Duration e.g. '365d' (default: 365d) |

**Example Request:**

```bash
curl -X POST "https://your-domain.com/api/admin/tokens" \
  -H "Content-Type: application/json" \
  -d '{"name": "External Service", "expiresIn": "30d"}'
```

**Response:**

```json
{
  "message": "Token generated successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

---

## Endpoints

### Deposits

#### List Deposits

Retrieve a paginated list of deposits.

- **URL**: `/api/deposits`
- **Method**: `GET`

**Parameters (Query):**

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | number | No | Page number (default: 1) |
| `pageSize` | number | No | Items per page (default: 100) |

**Example:**

```bash
curl -X GET "https://your-domain.com/api/deposits?page=1&pageSize=50" \
  -H "Authorization: Bearer <TOKEN>"
```

#### Upload Deposits (CSV)

Upload a CSV file containing deposit data.

- **URL**: `/api/deposits`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`

**Parameters:**

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | file (csv) | **Yes** | CSV file to upload |
| `overwrite` | boolean | No | If true, replaces all existing data (query param) |

**Example:**

```bash
curl -X POST "https://your-domain.com/api/deposits?overwrite=false" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/deposits.csv"
```

---

### Client Exonerated

#### List Client Exonerated

Retrieve a paginated list of exonerated clients.

- **URL**: `/api/client-exonerated`
- **Method**: `GET`

**Parameters (Query):**

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | number | No | Page number (default: 1) |
| `pageSize` | number | No | Items per page (default: 100) |

**Example:**

```bash
curl -X GET "https://your-domain.com/api/client-exonerated?page=1&pageSize=50" \
  -H "Authorization: Bearer <TOKEN>"
```

#### Upload Client Exonerated (XLSX)

Upload an Excel file containing exonerated client data.

- **URL**: `/api/client-exonerated`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`

**Parameters:**

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | file (xlsx) | **Yes** | Excel file to upload |
| `overwrite` | boolean | No | If true, replaces all existing data (query param) |

**Example:**

```bash
curl -X POST "https://your-domain.com/api/client-exonerated?overwrite=false" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/clients.xlsx"
```
