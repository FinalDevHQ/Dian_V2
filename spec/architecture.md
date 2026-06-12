# Architecture

## Monorepo Structure

```
Dian_V2/
├── apps/
│   ├── web/          # Frontend: Vite + React 19 + Tailwind v4 + shadcn/ui
│   └── server/       # Backend: Node.js bot server
├── packages/
│   ├── shared/           # @myfinal/dian-shared     — Brand types, BotEvent, utilities
│   ├── logger/           # @myfinal/dian-logger     — Pino-based logging
│   ├── config/           # @myfinal/dian-config     — YAML + Zod + hot-reload
│   ├── event-bus/        # @myfinal/dian-event-bus  — Type-safe event system
│   ├── module-runtime/   # @myfinal/dian-module-runtime — Module lifecycle
│   ├── plugin-runtime/   # @myfinal/dian-plugin-runtime — Plugin system
│   ├── storage/          # @myfinal/dian-storage    — SQLite via sql.js
│   └── scheduler/        # @myfinal/dian-scheduler  — Cron/interval/delay
├── config/           # Shared config templates
├── spec/             # Project specifications
└── .vscode/          # VSCode workspace settings
```

## Dependency Direction

```
✅ web ──→ shared
✅ server ──→ packages/*
✅ packages/* ──→ shared (allowed deps only, see graph below)

❌ shared ──→ web
❌ shared ──→ server
❌ apps/web ──→ apps/server
❌ apps/server ──→ apps/web
```

Layers must never point upward or sideways — only downward.

## Dependency Graph

```
shared (zero deps)
  ├── logger ─────────── standalone
  ├── event-bus ──────── → shared
  ├── config ─────────── → shared
  ├── module-runtime ─── → shared, logger, event-bus
  ├── plugin-runtime ─── → shared, logger, config, module-runtime
  ├── storage ────────── → shared, logger
  └── scheduler ──────── → logger

apps/server ──────────── → all @myfinal/dian-* packages
apps/web   ──────────── independent
```

## Package Rules

1. Every package has a single barrel file `index.ts` that re-exports all public APIs.
2. A package in `packages/` may only depend on `shared` or other `packages/` packages listed in its dependency graph above.
3. No cyclic dependencies — enforce with `dpdm` or `madge` in CI.
4. Adding a new package requires approval — it increases the maintenance surface.

## Key Design Decisions

1. **Factory Function Pattern**: Every service exports `createXxx()` → class instance.
2. **Event-Driven**: Bot events flow through typed event bus with middleware chain.
3. **No HTTP Framework**: Server is an in-process bot orchestrator, not a web server.
4. **Plugin System**: Decorator (`@Plugin/@Handler`) and functional styles, equally supported.
5. **Static Typing**: Brand types (`BotId`, `UserId`) via `unique symbol` nominal typing.
