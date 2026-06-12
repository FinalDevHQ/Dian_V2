# Backend

## Tech Stack

- Node.js + TypeScript (ES2022, module NodeNext)
- Event-driven architecture (no HTTP framework — in-process bot orchestrator)
- Config: YAML + Zod validation + hot-reload (chokidar)
- Storage: SQLite via sql.js (WebAssembly)
- Logging: Pino (structured JSON)
- Testing: Vitest

## Package Conventions

```
packages/<name>/
├── package.json     # @myfinal/dian-<name>, type: module
├── tsconfig.json    # extends ../tsconfig.base.json, composite: true
├── src/
│   ├── index.ts     # Barrel file — re-exports all public APIs
│   ├── <name>.ts    # Main implementation
│   └── types.ts     # Public types
└── dist/
```

## Layer Pattern (if the package has a service layer)

```
Controller (if applicable)
  └── 只负责参数校验 + 调用 Service
Service
  └── 业务逻辑
Repository
  └── 数据库访问 (SQL / ORM)
DTO
  └── 数据传输对象 (plain object, no methods)
Entity
  └── 数据库映射实体
```

### Rules

```
❌ Controller → Repository (skip Service)
❌ Controller → raw SQL
❌ Service → Entity (must go through Repository)
```

Data flows one way: Controller → Service → Repository.

## Factory Function Pattern

```ts
// ✅ Correct
export function createLogger(options: LoggerOptions): Logger {
  return new Logger(options)
}

// ❌ Wrong
const logger = new Logger(options)
```

## Class Pattern

```ts
export class Logger {
  private _level: LogLevel = "info"
  private _pino: pino.Logger

  get level(): LogLevel {
    return this._level
  }
}
```

## Coding Rules

1. ESM imports always include `.js` extension: `import { BotEvent } from "@myfinal/dian-shared/events.js"`
2. Section comments: `// ── Section Title ──────────────────────`
3. JSDoc on all public APIs with `@example` where helpful
4. No `any` — use `unknown` + type guards or generics
5. Private fields use `_name` convention (not `#name`)
6. No circular imports — detect with `dpdm` or `madge`
7. Async methods return `Promise<void>` unless data is returned

## Plugin Patterns

### Decorator
```ts
@Plugin({ name: "greet", permissions: ["reply"] })
export class GreetPlugin {
  @Handler(/^hello/i)
  async onHello(ctx: HandlerContext) {
    await ctx.reply("Hello!")
  }
}
```

### Functional
```ts
export default {
  meta: { name: "greet", permissions: ["reply"] },
  handlers: [{ match: /^hello/i, async handle(ctx) { await ctx.reply("Hello!") } }],
}
```

## Error Handling

```ts
export class ConfigError extends Error {
  constructor(message: string, public readonly path?: string) {
    super(message)
    this.name = "ConfigError"
  }
}
```

Always use typed error classes — never `throw new Error("msg")`.

## Initialization Lifecycle

```
init() → discover() → startAll() → loadAll()
                                    └── plugins.watch()
```
