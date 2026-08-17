# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

GymApp — a mobile-first, Spanish-language gym training web app with AI-generated workout plans. Next.js 14 (App Router) + TypeScript, Tailwind CSS, PostgreSQL (Neon) via Prisma, NextAuth.js.

## Commands

```bash
npm run dev              # dev server (http://localhost:3000 — pass -p <port> if that's taken)
npm run build            # production build (runs full type-check)
npm run start            # production server
npm run lint             # next lint

npx prisma migrate dev --name <name>   # create/apply a migration (also: npm run prisma:migrate)
npx prisma generate                    # regenerate Prisma client after schema.prisma changes
npx prisma db seed                     # seed exercises from prisma/data/exercises.json (also: npm run prisma:seed)
npx prisma studio                      # DB browser UI (also: npm run prisma:studio)

npx tsx scripts/create-user.ts         # create an initial user directly in the DB
```

Tests: Vitest (`npm test` to run once, `npm run test:watch` for watch mode). The suite lives in `tests/` (`unit/` for domain logic, `api/` for route handlers called directly, `hooks/` for client hooks via `@testing-library/react` + a per-file `@vitest-environment jsdom` pragma) and runs fully mocked — no DB or network needed. Prisma is mocked via the explicit hand-rolled mock in `tests/helpers/prisma-mock.ts` (add methods there when routes start using new ones), sessions via mocking `next-auth`'s `getServerSession`. `tests/helpers/fixtures.ts` builds schema-valid generated plans.
Env vars required: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (optional — leave blank to disable Google sign-in locally), `AI_PROVIDER` (`openai` or `anthropic`), `OPENAI_API_KEY`/`OPENAI_MODEL`, `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`. No `.env.example` is committed; `.env` is gitignored. For local dev, a Postgres instance is easiest to run via `docker run -e POSTGRES_USER=gymapp -e POSTGRES_PASSWORD=gymapp -e POSTGRES_DB=gymapp -p 5434:5432 postgres:17-alpine` with `DATABASE_URL="postgresql://gymapp:gymapp@localhost:5434/gymapp"`. `NEXTAUTH_URL` must match whatever host/port the app actually runs on, or the credentials/OAuth callback flow silently breaks.

## Architecture

### Data model (`prisma/schema.prisma`)

`User` → `Profile` (goal/level/age/height/weight) and `Plan[]` (training plans). A `Plan` has `planDays: PlanDay[]` (7 rows per plan, some `isRest`), each `PlanDay` has `exercises: PlanExercise[]` (sets/reps/rest prescription referencing the `Exercise` catalog) and `workouts: WorkoutSession[]` (actual logged sessions, one per time the user trained that day). A `WorkoutSession` has `sets: WorkoutSet[]` (actual reps/weight/RPE logged, unique per `sessionId+exerciseId+setNumber` for upserts). `PlanFeedback` (difficulty rating, `TOO_EASY`–`TOO_HARD`) is collected when a plan finishes and feeds into the next plan's generation as progression context — a `Plan` can technically have more than one `PlanFeedback` row (it's a `[]` relation) even though the app only ever creates one; treat `plan.feedback[0]` as "the" feedback, not the whole array, and never do a truthy check directly on `plan.feedback` (an empty array is truthy).

The `Goal` enum (`HYPERTROPHY`, `STRENGTH`, `ENDURANCE`, `FAT_LOSS`, `RECOMPOSITION`) is shared between `Profile.goal` and `Plan.goal`; it's also hardcoded as string-literal unions in `src/lib/ai/schemas.ts` and various page components — if you add/rename a goal, update all of these together, there's no single source of truth enforced by the type system.

### AI plan generation (`src/lib/ai/`)

This is the core domain logic, orchestrated by `generateTrainingPlan()` in `generate-plan.ts`:
1. Loads the user's `Profile` and the `Exercise` pool filtered to full-gym equipment.
2. If regenerating (`previousPlanId`), pulls prior session data to build a progression context (average weights per exercise, completion rate) via `fetchProgressionData`.
3. Assembles a prompt from `prompts.ts` (system prompt, user context, plan request, exercise pool, response-format instructions).
4. Calls `callLLM()` (`client.ts`) — a provider-agnostic wrapper that dispatches to OpenAI or Anthropic based on `AI_PROVIDER`, both expected to return JSON.
5. Parses with `parseJSONResponse()` (handles markdown-fenced or loosely-wrapped JSON) and validates against `GeneratedPlanSchema` (Zod, in `schemas.ts` — requires exactly 7 days, 3-7 exercises on training days, 0 on rest days).
6. Validates every `exerciseId` in the LLM output actually exists in the DB pool (`validateExerciseIds`), and that the training-day count matches the request.
7. Retries the whole LLM call up to `MAX_RETRIES` (2) on validation failure before giving up.

`save-plan.ts` persists a validated `GeneratedPlan` into the relational `Plan`/`PlanDay`/`PlanExercise` structure. Adding a new AI provider means extending `client.ts`'s `callLLM`/`callOpenAI`/`callAnthropic` trio; changing what the LLM must produce means updating `schemas.ts` and `prompts.ts` (`RESPONSE_FORMAT`) together, since the schema is the contract the retry loop enforces.

### Auth & route protection

NextAuth (`src/lib/auth.ts`) uses JWT sessions with Credentials (bcrypt-hashed `password` on `User`) and Google OAuth providers, backed by `@auth/prisma-adapter`. The route handler lives at `src/app/api/auth/[...nextauth]/route.ts`; registration (email/password sign-up, separate from NextAuth itself) is `src/app/api/auth/register/route.ts`. The root layout wraps the app in a client-boundary `SessionProvider` (`src/components/providers/session-provider.tsx`) so `useSession()` works — `next-auth/react`'s own `SessionProvider` has no `'use client'` directive, so it can't be dropped into the server-component layout directly.

`src/middleware.ts` gates every non-static route: unauthenticated users are redirected to `/auth/login`; authenticated users hitting `/auth/login` or `/auth/register` are redirected to `/`; authenticated users whose profile isn't complete are redirected to `/onboarding`, based on a `hasProfile` flag on the JWT (set in the `jwt` callback in `auth.ts` by checking for a `Profile` row, and refreshed via `trigger === 'update'`). `/api/auth/*` must stay fully bypassed by the middleware (not merely treated as a "public page") — routing it through the authenticated-user-redirect check breaks `useSession()`/sign-out for every logged-in user, since NextAuth's own session/callback/signout endpoints get hit constantly while authenticated.

Because the JWT is stateless, `hasProfile` only updates when the client explicitly calls `update()` from `useSession()` (see `src/app/onboarding/page.tsx`, called right after `POST /api/profile` succeeds) — a raw page reload won't re-check the DB.

### App structure

- `src/app/` — App Router pages plus colocated API routes under `src/app/api/*/route.ts` (plan generation/feedback/stats, workout session/set logging, exercise catalog, profile, progress).
- `src/lib/exercises.ts`, `src/lib/progress.ts`, `src/lib/plan-completion.ts` — query/aggregation logic used by pages and API routes (exercise search/filtering with Spanish-to-dataset value mapping, weekly volume/frequency/streak/PR calculations, plan-completion and feedback-prompt eligibility).
- `src/hooks/useWorkout.ts` — client-side state machine for an in-progress workout session: builds per-exercise set lists (pre-populating weight from the previous session), optimistically completes/undoes sets while POSTing to `/api/workouts/[sessionId]/sets`, tracks elapsed time and computed volume.
- Exercise data model uses English dataset values internally (`bodyPart`, `equipment`, `target` — e.g. `"upper arms"`, `"dumbbell"`) with Spanish-facing UI; the mapping tables live in `src/lib/exercises.ts` (search filters) and `src/lib/ai/generate-plan.ts` (`GYM_EQUIPMENT` list of equipment values eligible for AI-generated plans).
- `prisma/seed.ts` reads `prisma/data/exercises.json` (present in the working tree, ~1300 exercises) and derives image/gif URLs from a fixed GitHub-hosted exercise media repo. Each entry's `instructions.es` is a single narrative string (not an array — don't `.join()` it); `instruction_steps.es` is the step-by-step array form, currently unused by the seed script.
