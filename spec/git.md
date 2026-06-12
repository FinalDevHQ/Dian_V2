# Git Conventions

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code |
| `develop` | Integration branch for features |
| `feat/<name>` | New features — branch from `develop`, merge back to `develop` |
| `fix/<name>` | Bug fixes — branch from `develop` or `main` for hotfix |
| `refactor/<name>` | Code restructuring — no behavior changes |

## Commit Message Format

```
<type>: <description>

[optional body]
```

### Types

| Type | Usage |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructuring |
| `docs` | Documentation only |
| `style` | Formatting, linting (no logic change) |
| `chore` | Build, tooling, dependencies |
| `perf` | Performance improvement |
| `test` | Adding/updating tests |

### Examples

```
feat: add message search to storage service
fix: prevent crash on empty config file
refactor: extract plugin loader into separate module
docs: add JSDoc to all public API methods
chore: update pino to v9
```

## Pull Request Checklist

- [ ] Code follows project conventions (see `spec/`)
- [ ] No `console.log` or debug code left in
- [ ] All new public APIs have JSDoc
- [ ] No `any` types introduced
- [ ] Tests pass (if applicable)
