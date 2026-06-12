# Frontend

## Tech Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- shadcn/ui (radix-nova style)
- Lucide React (icons)
- tw-animate-css (animations)
- Geist Variable font (Fontsource)
- Routing: TBD
- State management: TBD

## File Structure

```
src/
├── pages/            # Page-level components, one per route
│   └── home/
│       ├── HomePage.tsx
│       └── HomePage.test.tsx
├── features/         # Feature modules with business logic
│   └── dashboard/
│       ├── components/    # Feature-specific components
│       ├── hooks/         # Feature-specific hooks
│       ├── services/      # Feature-specific API calls
│       └── types.ts       # Feature-specific types
├── components/
│   ├── ui/           # shadcn/ui primitives (generated, do not edit)
│   ├── layout/       # Layout components (Sidebar, Header, etc.)
│   └── shared/       # Reusable presentational components
├── hooks/            # Shared custom hooks
├── services/         # API client, service layer
├── stores/           # Global state (zustand / context)
├── lib/              # Utilities (cn, formatters, etc.)
├── types/            # Global TypeScript types
├── App.tsx           # Root component + routing
├── main.tsx          # Entry point
└── index.css         # Tailwind import + global styles
```

## Feature vs Component

```
features/       → 允许业务逻辑 (API calls, state, side effects)
components/     → 禁止业务逻辑 (pure presentational, props only)
```

A file in `components/shared/` must not:
- Call hooks that fetch data
- Import anything from `services/`
- Manage non-UI state

If a component needs business logic, move it to `features/<name>/components/`.

## Component Conventions

```tsx
// ✅ Correct
export function UserProfile({ userId, className }: UserProfileProps) {
  const { data, isLoading } = useUser(userId)

  if (isLoading) return <Skeleton className="h-20 w-full" />
  if (!data) return null

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar>
        <AvatarImage src={data.avatar} />
        <AvatarFallback>{data.initials}</AvatarFallback>
      </Avatar>
      <p className="text-sm font-medium">{data.name}</p>
    </div>
  )
}

interface UserProfileProps {
  userId: string
  className?: string
}
```

## Route / Page Pattern

```tsx
// pages/home/HomePage.tsx
export function HomePage() {
  const { data } = useDashboardStats()
  return <DashboardStats data={data} />
}

// App.tsx
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/dashboard" element={<DashboardPage />} />
</Routes>
```

## Hooks

- Shared hooks go in `src/hooks/`.
- Feature-specific hooks go in `features/<name>/hooks/`.
- Every hook is a function, exported as named export.
- File name matches hook name: `useUser.ts` → `export function useUser()`.

## Styling

1. Tailwind classes only — avoid custom CSS files.
2. Use `cn()` from `@/lib/utils` for conditional class merging.
3. Use shadcn theme variables: `bg-primary`, `text-muted-foreground`.
4. No inline styles.
5. Custom CSS only in `index.css` via CSS variables or `@apply`.

## shadcn/ui

1. Files in `components/ui/` are generated — do not edit.
2. Add components: `npx shadcn@latest add <name>`.
3. Compose UI primitives into domain components in `features/` or `components/shared/`.

## Imports

```tsx
// ✅ use @/ alias
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"

// ❌ deep relative imports
import { Button } from "../../components/ui/button"
```

## State & Data Flow

1. Local state first → lift or use context/zustand only when multiple unrelated components need it.
2. Server data goes through hooks in `hooks/` or `features/*/hooks/`.
3. No prop drilling beyond 2 levels.
