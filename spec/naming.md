# Naming

## TypeScript / JavaScript

| Item | Convention | Example |
|---|---|---|
| Variable | camelCase | `userName`, `isLoading` |
| Function | camelCase | `getUser()`, `formatDate()` |
| Class | PascalCase | `Logger`, `ConfigService` |
| Interface | PascalCase | `UserProfile`, `BotEvent` |
| Type | PascalCase | `UserId`, `HandlerContext` |
| Enum | PascalCase, values UPPER | `enum LogLevel { DEBUG, INFO }` |
| Const (primitive) | camelCase | `const maxRetries = 3` |
| Const (config-like) | UPPER | `const MAX_FILE_SIZE = 1048576` |
| Generic param | single uppercase | `T`, `K`, `V` |
| Private field | `_` + camelCase | `_logger`, `_config` |
| Boolean prefix | `is`, `has`, `can` | `isVisible`, `hasError`, `canEdit` |

## React

| Item | Convention | Example |
|---|---|---|
| Component file | PascalCase | `UserCard.tsx` |
| Component export | PascalCase | `export function UserCard()` |
| Hook file | camelCase, `use` prefix | `useAuth.ts` |
| Hook export | camelCase, `use` prefix | `export function useAuth()` |
| Props interface | PascalCase + `Props` | `UserCardProps` |
| Event handler | `on` + PascalCase | `onSubmit`, `onClick` |
| State setter | `set` + PascalCase | `setUser`, `setIsLoading` |

## Database

| Item | Convention | Example |
|---|---|---|
| Table | snake_case, plural | `user_account` |
| Column | snake_case | `created_at`, `user_id` |
| Primary key | `id` | `id BIGINT` |
| Foreign key | `<table>_id` | `user_id` |

## File / Directory

| Item | Convention | Example |
|---|---|---|
| Source file | camelCase | `utils.ts`, `api.ts` |
| React component | PascalCase | `UserCard.tsx` |
| Package directory | kebab-case | `event-bus`, `plugin-runtime` |
| Test file | `<name>.test.ts` | `utils.test.ts` |
| Type file | `types.ts` | `types.ts` |

## Git

| Item | Convention | Example |
|---|---|---|
| Branch | `<type>/<name>` | `feat/add-login`, `fix/crash-on-empty` |
| Commit type | lowercase | `feat`, `fix`, `refactor`, `docs` |
| Commit desc | lowercase, imperative | `add message search to storage` |
