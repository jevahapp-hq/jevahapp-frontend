# Codebase Structure

This document describes the modular architecture and where to add new code.

## Directory Layout

```
jevahapp-frontend/
├── app/                      # Expo Router app (routes, app-specific code)
│   ├── _layout.tsx           # Root layout
│   ├── auth/                 # Auth screens (login, signup, verification)
│   ├── categories/           # Content screens (HomeScreen, upload, music, etc.)
│   ├── components/           # App-specific components
│   ├── hooks/                # App-specific hooks
│   ├── screens/              # Screen components
│   ├── services/             # API services & domain logic
│   │   └── copyright-free/   # Copyright-free music (types, service)
│   ├── store/                # Zustand stores
│   └── utils/                # App utilities
│
└── src/                      # Shared, reusable code
    ├── core/                 # Core infrastructure
    │   └── api/              # API clients (MediaApi, ApiClient)
    ├── features/             # Feature modules
    │   └── media/            # Media feature (AllContentTikTok, VideoCard, etc.)
    └── shared/               # Shared across features
        ├── components/       # Reusable UI components
        ├── hooks/            # Reusable hooks
        ├── utils/            # Shared utilities
        ├── types/            # TypeScript types
        └── constants/        # Constants
```

## Module Boundaries

| Layer | Purpose | Imports |
|-------|---------|---------|
| **app/** | Routes, screens, app glue | Can import from `src/` |
| **src/features/** | Feature logic, domain-specific components | Import from `src/shared/`, `src/core/` |
| **src/shared/** | Reusable components, hooks, utils | Import from `src/core/` only |
| **src/core/** | API clients, base services | No app-specific imports |

## Path Aliases

Use these for cleaner imports:

| Alias | Path |
|-------|------|
| `@/shared/*` | `src/shared/*` |
| `@/core/*` | `src/core/*` |
| `@/features/*` | `src/features/*` |
| `@/*` | Root |

## Adding New Code

- **New API service** → `app/services/<domain>/` or `src/core/api/services/`
- **New shared component** → `src/shared/components/`
- **New feature** → `src/features/<feature-name>/`
- **New store** → `app/store/` (app-specific) or `src/core/store/` (reusable)
- **New screen/route** → `app/` (Expo Router file-based routing)

## Modularization Guidelines

1. **Split large files** (>500 lines): Extract types, split by domain (e.g. `copyright-free/types.ts`, `copyright-free/CopyrightFreeMusicService.ts`).
2. **Preserve backward compatibility**: When splitting, keep a re-export from the original path so existing imports keep working.
3. **Avoid circular dependencies**: `src/shared/` should not import from `app/`. Move shared logic to `src/` if needed.
4. **Use barrel exports** for public APIs: `src/core/index.ts`, `src/shared/index.ts` export the module surface.
