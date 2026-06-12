# Dian V2 Architecture

## Monorepo Structure

```
Dian_V2/
├── apps/
│   ├── web/          # Frontend: Vite + React 19 + Tailwind v4 + shadcn/ui
│   └── server/       # Backend: Node.js bot server (no HTTP framework)
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
├── spec/             # Project specifications (this directory)
└── .vscode/          # VSCode workspace settings
```

## Dependency Graph

```
shared ──────────────────────────────────────────────────────
  ├── logger ─────────────────── standalone (pino wrapper)
  ├── event-bus ──────────────── depends on shared
  ├── config ─────────────────── depends on shared, chokidar, zod
  ├── module-runtime ─────────── depends on shared, logger, event-bus
  ├── plugin-runtime ─────────── depends on shared, logger, config, module-runtime
  ├── storage ────────────────── depends on shared, logger
  └── scheduler ──────────────── depends on logger

apps/server ──────────────────── depends on all @myfinal/dian-* packages
apps/web   ──────────────────── independent (Vite + React)
```

## Key Design Decisions

1. **Factory Function Pattern**: Every service exports a `createXxx()` factory function that returns a class instance. No `new` outside the factory.

2. **Event-Driven Architecture**: Bot events flow through a typed event bus with middleware chain (onion model). Plugins subscribe via decorator (`@Handler`) or functional handlers.

3. **No HTTP Framework**: The server is an in-process bot orchestrator, not a web server. Communication happens through events, not HTTP routes.

4. **Plugin System**: Two styles — decorator (`@Plugin/@Handler`) and functional. Both are equally supported.

5. **Static Typing**: Brand types (`BotId`, `UserId`, etc.) use nominal typing via `unique symbol` for type safety.

## Module/File Naming

| Pattern | Example |
|---|---|
| `packages/<name>/` | `packages/logger/` |
| Source files inside package | `logger.ts`, `types.ts`, `index.ts` |
| Multiple related files | `sqlite-log.ts`, `sqlite-message.ts` |
| Barrel export | Always `index.ts` re-exporting all public APIs |
