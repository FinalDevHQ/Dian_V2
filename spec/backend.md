# Backend Conventions

## Tech Stack

- **Runtime**: Node.js, TypeScript (target ES2022, module NodeNext)
- **Architecture**: Event-driven, in-process (no HTTP framework)
- **Config**: YAML files validated with Zod schemas
- **Storage**: SQLite via `sql.js` (WebAssembly)
- **Logging**: Pino (structured JSON logger)
- **Testing**: Vitest (detected from package config)

## Package Conventions

Every shared package (`packages/*`) follows the same pattern:

```
packages/<name>/
├── package.json        # name: @myfinal/dian-<name>, type: module
├── tsconfig.json       # extends ../tsconfig.base.json, composite: true
├── src/
│   ├── index.ts        # Barrel file — re-exports all public APIs
│   ├── <name>.ts       # Main implementation (if simple)
│   └── types.ts        # Public type definitions (optional)
└── dist/               # Build output (gitignored)
```

## Factory Function Pattern

```ts
// ✅ Correct
export function createLogger(options: LoggerOptions): Logger {
  return new Logger(options)
}

// ❌ Wrong — always use factory function
const logger = new Logger(options)
```

## Class Pattern

```ts
export class Logger {
  // Private state with underscore prefix
  private _level: LogLevel = "info"
  private _pino: pino.Logger

  // Public getters
  get level(): LogLevel {
    return this._level
  }

  // Public methods (no underscore)
  async info(msg: string): Promise<void> {
    this._pino.info(msg)
  }
}
```

## Coding Conventions

1. **ESM imports always include `.js` extension**: `import { BotEvent } from "@myfinal/dian-shared/events.js"`
2. **Section comments** use `// ── Section Title ──────────────────────`
3. **JSDoc** on all public APIs with `@example` where helpful
4. **No `any`** — use `unknown` + type guards or generics
5. **Private fields** use `_name` convention (not `#name`)
6. **Async methods** return `Promise<void>` unless data is returned

## Plugin Patterns

### Decorator Style
```ts
import { Plugin, Handler } from "@myfinal/dian-plugin-runtime"

@Plugin({ name: "greet", permissions: ["reply"] })
export class GreetPlugin {
  @Handler(/^hello/i)
  async onHello(ctx: HandlerContext) {
    await ctx.reply("Hello! How can I help you?")
  }
}
```

### Functional Style
```ts
export default {
  meta: { name: "greet", permissions: ["reply"] },
  handlers: [
    {
      match: /^hello/i,
      async handle(ctx: HandlerContext) {
        await ctx.reply("Hello! How can I help you?")
      },
    },
  ],
}
```

## Error Handling

```ts
// Custom error classes
export class ConfigError extends Error {
  constructor(message: string, public readonly path?: string) {
    super(message)
    this.name = "ConfigError"
  }
}

// Always use typed errors, not generic Error
throw new ConfigError("Invalid config file", filePath)
```

## Async Initialization Lifecycle

```
init() → discover() → startAll() → loadAll()
                                    └── plugins.watch()
```
