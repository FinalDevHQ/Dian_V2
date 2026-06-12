# Dian V2 — AGENTS.md

## Monorepo (npm workspaces)

```
Dian_V2/
├── apps/
│   ├── web/          # Vite 8 + React 19 + Tailwind v4 + shadcn/ui
│   └── server/       # Bot server (event-driven, no HTTP)
├── packages/         # 8 shared @myfinal/dian-* packages
│   ├── shared/       # Brand types, BotEvent (zero deps)
│   ├── logger/       # Pino wrapper
│   ├── config/       # YAML + Zod + hot-reload
│   ├── event-bus/    # Typed event bus with middleware
│   ├── module-runtime/
│   ├── plugin-runtime/ # Decorator + functional styles
│   ├── storage/      # SQLite via sql.js
│   └── scheduler/    # Cron/interval/delay
└── spec/             # 8 convention files for AI/collaboration
```

## Commands

| Command | When | Where |
|---|---|---|
| `npm run build` | Build all packages + apps/server | root |
| `npm run dev -w packages` | Watch-mode tsc for packages | root |
| `npm start -w apps/server` | Run bot server | root |
| `cd apps/web && npm run dev` | Start Vite frontend dev server | apps/web |
| `cd apps/web && npm run build` | Typecheck + Vite build | apps/web |
| `cd apps/web && npm run lint` | ESLint flat config | apps/web |
| `cd packages && npm run build` | tsc -b (incremental composite) | packages |

`npm run build` === `npm run build -w packages && npm run build -w apps/server`

## Architecture Constraints

- **Dependency direction**: `web → shared` only. `server → packages → shared`. No reverse/peer deps.
- **No test framework configured yet** — do not assume vitest/jest.
- **ESM everywhere**: all imports use `.js` extension in source files (TypeScript + NodeNext).
- **Factory function pattern**: `createXxx()` returns class instance. No `new` outside factories.
- **Private fields**: `_name` convention, not `#`.
- **ES2022 target + NodeNext module** for packages.
- **Composite TypeScript** — packages build with `tsc -b`, using project references.
- **Server is NOT HTTP** — it's an in-process bot orchestrator using event bus.
- **Plugin system**: supports decorator (`@Plugin/@Handler`) AND functional styles.

## Package Dependencies

```
shared (zero deps) → logger, event-bus, config
logger, event-bus (→ shared) → module-runtime (→ shared, logger, event-bus)
config (→ shared) → plugin-runtime (→ shared, logger, config, module-runtime)
storage (→ shared, logger)
scheduler (→ logger)
```

- Config: `apps/server/config/*.yaml` loaded via Zod schemas.
- Storage: SQLite at path from `settings.yaml`.

## Web Frontend (apps/web)

- Vite 8, `@/` alias → `./src/`
- Tailwind v4 via `@tailwindcss/vite` plugin (no postcss config needed)
- shadcn/ui radix-nova style, `components.json` already generated
- Use `cn()` from `@/lib/utils` for className merging
- `components/ui/` is auto-generated — never edit manually, use `npx shadcn@latest add`
- No routing or state management library installed yet

## Known Quirks

- **Proxy**: system env `http_proxy=127.0.0.1:7897` exists — if VSCode schema download fails, check this.
- **Frontend TS version ~6.0.2**: uses `"ignoreDeprecations": "6.0"` for deprecated `baseUrl`.
- **No test files exist** anywhere in the repo yet.
- Co-located dirs `Dian/`, `ErisPulse/`, `Jianer_QQ_bot/` are NOT part of the monorepo workspace.

## Project Conventions

Read `spec/*.md` for full details. Key shortcuts:

| File | Purpose |
|---|---|
| `spec/naming.md` | Naming across TS/React/DB/Git |
| `spec/frontend.md` | `features/`=business logic, `components/`=pure presentational |
| `spec/backend.md` | Controller→Service→Repository layer flow |
| `spec/api.md` | Unified `{code, message, data}` response format |
| `spec/database.md` | snake_case, UTC timestamps, soft delete |
| `spec/ai.md` | AI generation constraints (no `any`, no `console.log`, no `TODO`) |

## CI / PR

- **No CI workflows** configured yet.
- Branch convention: `feat/<name>`, `fix/<name>`, `refactor/<name>`.
- Commit convention: `type: description` (feat/fix/refactor/docs/chore).
