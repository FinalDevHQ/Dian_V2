# Database

## Naming

| Item | Convention | Example |
|---|---|---|
| Table name | snake_case, plural | `user_account`, `order_record` |
| Column name | snake_case | `created_at`, `user_id` |
| Primary key | `id` | `id BIGINT PRIMARY KEY` |
| Foreign key | `<table>_id` | `user_id`, `order_id` |
| Index | `idx_<table>_<column>` | `idx_user_account_email` |
| Unique index | `uidx_<table>_<column>` | `uidx_user_account_email` |

### ❌ Wrong

```
UserAccount
OrderRecord
createdAt
updatedAt
```

## Column Types

| Type | Usage |
|---|---|
| `BIGINT` | Primary keys, foreign keys |
| `TEXT` | Strings, JSON blobs |
| `INTEGER` | Counters, enums, booleans (0/1) |
| `REAL` | Decimal numbers |
| `BLOB` | Binary data |

## Timestamps

Every table MUST include:

```sql
created_at TEXT NOT NULL  -- ISO 8601 UTC
updated_at TEXT NOT NULL  -- ISO 8601 UTC
deleted_at TEXT           -- ISO 8601 UTC, NULL = not deleted
```

- All timestamps are **UTC only**. No local time, no timezone offset.
- Format: `2026-06-12T23:59:59.000Z`

## Soft Delete

Use `deleted_at` instead of physical delete:

```sql
-- ✅ Query excludes soft-deleted rows
SELECT * FROM user_account WHERE deleted_at IS NULL

-- ❌ Never DELETE FROM
DELETE FROM user_account WHERE id = ?
```

## Migrations

- Each migration file is versioned: `V001__create_user_account.sql`
- Migrations are run in order, never reordered.
- A migration must be reversible (up + down).
- Migration files are committed to the repo.

## Config (Zod Schema Example)

```ts
const SettingsSchema = z.object({
  logLevel: z.enum(["trace","debug","info","warn","error","fatal"]),
  storage: z.object({
    sqlite: z.object({
      path: z.string(),
      enableWal: z.boolean().default(true),
    }),
  }),
})
```
