# I See the Light

A mobile-first Progressive Web App gratitude journal inspired by ocean tides, floating lanterns, and the emotional atmosphere of "I See the Light" from Tangled.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/i-see-the-light run dev` — run the PWA frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` and `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — set automatically by Replit AI Integrations

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- PWA: React + Vite (react-vite artifact at `/`)
- API: Express 5 (api-server artifact at `/api`)
- AI: Anthropic Claude via Replit AI Integrations proxy
- DB: PostgreSQL + Drizzle ORM (conversations + messages tables)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle for API), Vite (PWA frontend)

## Where things live

- `artifacts/i-see-the-light/src/` — PWA frontend (React, 4-screen app)
- `artifacts/api-server/src/routes/poetry/` — AI poetry generation route
- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas
- `lib/integrations-anthropic-ai/` — Anthropic SDK client wrapper
- `lib/db/src/schema/` — Drizzle schema (conversations, messages)
- `artifacts/i-see-the-light/public/manifest.json` — PWA manifest
- `artifacts/i-see-the-light/public/sw.js` — Service worker

## Architecture decisions

- Single HTML page app: 4 emotional "screens" managed via React state with CSS cross-fade transitions (never router-based navigation)
- All journal data in localStorage as JSON — no backend persistence needed for journaling
- AI poetry calls go through our Express API server (not directly from browser) to keep API keys server-side
- Canvas-based animations (waves, particles, lanterns) using requestAnimationFrame for smooth 60fps
- Anthropic AI Integrations proxy used — no user API key needed, billed to Replit credits

## Product

- **Screen 1 — Breathing Entry:** Ocean canvas with animated waves, breathing orb, 3 auto-timed breath cycles
- **Screen 2 — I See the Light:** Mood check-in (Clear/Soft/Heavy/Quiet) + AI-generated morning quote
- **Screen 3 — Gratitude Writing:** 3 frosted-glass input cards + ceremonial lantern release animation
- **Screen 4 — Your Memory Sky:** Night sky with past entries as floating lanterns, tap to view details

## User preferences

- This is NOT productivity software — no streaks, achievements, gamification, or dashboard aesthetics
- Emotional goal: users leave feeling lighter, comforted, quietly hopeful
- Fonts: Cormorant Garamond (emotional/poetic) + Nunito 300-400 (structural)
- Color: Deep twilight blue (#0d1220) + warm honey gold (#D7A54B) primary palette

## Gotchas

- After OpenAPI spec changes, always run `pnpm --filter @workspace/api-spec run codegen`
- The api-zod index.ts must only re-export from `./generated/api` (not types) — codegen regenerates it; if it adds the types export back, TypeScript will complain about duplicate exports
- Canvas elements need explicit resize handlers on `window.resize`
- PWA icons referenced from manifest.json need to exist in `public/` folder

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
