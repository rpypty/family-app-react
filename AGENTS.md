# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the app. Use `src/app/` for shell, routing, sync, theme, and app-level hooks; `src/features/` for user-facing domains like auth, family, onboarding, and mini-apps (`expense`, `todo`, `workouts`); and `src/shared/` for reusable API clients, hooks, storage, utilities, and UI primitives. Keep tests close to the code they verify, for example `src/features/miniapps/expense/expenses/components/ExpenseFormModal.test.tsx`. Static assets and the PWA manifest live in `public/`. Supabase local config is in `supabase/config.toml`.

## Build, Test, and Development Commands
Use npm in this repo; `package-lock.json` is committed.

- `npm install`: install dependencies.
- `npm run dev`: start the Vite dev server.
- `npm run build`: run TypeScript project builds, then produce a production bundle in `dist/`.
- `npm run preview`: serve the built app locally.
- `npm run lint`: run ESLint across the repository.
- `npm test`: run Vitest once in `jsdom`.

## Coding Style & Naming Conventions
Write React + TypeScript with strict typing enabled. Follow the existing style: 2-space indentation, single quotes, and semicolon-free statements. Export components and screens in `PascalCase`, hooks in `camelCase` with a `use` prefix, and keep helpers descriptive (`resolveExchangePreview`, `useOfflineOutbox`). Prefer colocating small feature-specific helpers inside the feature folder instead of expanding `shared/` too early. Linting is defined in `eslint.config.js`; fix lint issues before opening a PR.

## Testing Guidelines
Vitest and Testing Library are the default stack. Name tests `*.test.ts` or `*.test.tsx` and keep them beside the implementation. Add or update tests for any changed business logic, sync behavior, or interactive UI state. Use `src/test/setup.ts` utilities implicitly through Vitest rather than duplicating test bootstrap code.

## Commit & Pull Request Guidelines
Recent history favors short subjects such as `fix`, `ui-fix (#37)`, and `Feats/v2 (#35)`. Keep commit titles brief, imperative, and scoped to one change. Pull requests should include a concise summary, linked issue or task when available, screenshots for UI work, and notes about environment or API changes such as `.env` variables or proxy updates (`VITE_API_PROXY_TARGET`).

## Configuration Notes
Start from `.env.example` when adding local config. Do not commit secrets from `.env`. Coordinate any changes to service worker, manifest, or Supabase settings because they affect deployment and offline behavior.
