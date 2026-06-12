# API

## Unified Response Format (if HTTP API is added later)

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

| Field | Type | Description |
|---|---|---|
| `code` | number | 0 = success, non-zero = error |
| `message` | string | Human-readable status |
| `data` | any | Response payload |

### Success

```json
{
  "code": 0,
  "message": "success",
  "data": { "token": "xxx", "user": { "id": 1 } }
}
```

### Error

```json
{
  "code": 1001,
  "message": "invalid credentials",
  "data": null
}
```

### Paginated Response

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

## Error Codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1001 | Invalid credentials |
| 1002 | Token expired |
| 1003 | Permission denied |
| 2001 | Validation error |
| 2002 | Resource not found |
| 2003 | Resource conflict (duplicate) |
| 5000 | Internal server error |

## HTTP Methods

| Method | Action | Example |
|---|---|---|
| GET | Read | `GET /api/v1/users` |
| POST | Create | `POST /api/v1/users` |
| PUT | Full update | `PUT /api/v1/users/:id` |
| PATCH | Partial update | `PATCH /api/v1/users/:id` |
| DELETE | Delete | `DELETE /api/v1/users/:id` |

## URL Convention

```
/api/v1/<resource>
/api/v1/<resource>/:id
/api/v1/<resource>/:id/<sub-resource>
```

- Versions: `/api/v1/`, `/api/v2/`
- snake_case for URL params: `/api/v1/user-account`
- Plural nouns for collections: `/api/v1/users`
