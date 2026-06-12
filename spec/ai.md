# AI Generation Rules

When using AI (Claude, ChatGPT, Copilot, Cursor) to generate code, this file defines constraints.

## Before Generating

1. Read the following spec files first (in order):
   - `naming.md` — naming conventions
   - `frontend.md` — if generating React code
   - `backend.md` — if generating backend code
   - `api.md` — if generating API endpoints
   - `architecture.md` — dependency direction

2. Check existing files in the same directory to match existing patterns.

## Prohibited

- `any` type — use `unknown` + type guards
- `console.log` — use the project's logger instead
- `TODO` comments — either implement or don't write it
- Mock / placeholder code
- Duplicate code — reuse existing utilities
- Inline styles in React — use Tailwind classes
- Hardcoded strings that should be config
- Circular dependencies across packages

## Required

- JSDoc on every public function/class export
- Error handling for all async operations
- TypeScript strict mode compliant
- `.js` extension on all ESM imports
- Factory function pattern for service classes
- `cn()` utility for conditional Tailwind classes
- Proper UTC timestamps in database schemas

## Code Review Checklist (for AI Review)

- [ ] No `any`
- [ ] No `console.log`
- [ ] No `TODO`
- [ ] Follows naming convention in `naming.md`
- [ ] Follows directory structure in `frontend.md` or `backend.md`
- [ ] No circular imports
- [ ] Public APIs have JSDoc
- [ ] Error handling in place
- [ ] ESM imports have `.js` extension (backend)
