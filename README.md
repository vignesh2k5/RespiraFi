# RespiraFi

RespiraFi is a full-stack fitness safety and AI coaching platform. It combines a personalized onboarding profile, persisted weekly workout planning, date-aware Coach conversations, live telemetry, workout completion, recovery-aware adaptation, nutrition guidance, and authenticated user-scoped data.

> RespiraFi is an educational fitness platform and is not a medical device or a substitute for professional medical advice.

## Architecture

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui-style components, Recharts, tRPC React client.
- **Backend:** Node.js, Express, tRPC, Drizzle ORM, MySQL/TiDB, Manus OAuth, S3-compatible storage helpers.
- **Coach:** `server/coachServices.ts` contains the structured Coach context, intent handling, temporal resolution, weekly-plan source-of-truth logic, safety decisions, nutrition, recovery, and response rendering.
- **Telemetry:** Authenticated simulator and telemetry procedures support IoT-compatible BPM, speed, movement, intensity, status, and workout lifecycle data.
- **Database:** Drizzle schema and SQL migrations under `drizzle/`; all private application records are user-scoped.

## Repository structure

```text
client/                 React application, pages, components, styles
server/                 tRPC routers, database helpers, Coach services, tests
server/_core/           OAuth, context, runtime, storage, LLM and framework plumbing
drizzle/                Drizzle schema, relations, and SQL migrations
shared/                 Shared types and constants
patches/                Package patches
package.json            Scripts and dependencies
pnpm-lock.yaml          Locked dependency graph
tsconfig.json            TypeScript configuration
vite.config.ts          Vite configuration
vitest.config.ts        Vitest configuration
.env.example            Placeholder environment configuration
```

This export does not contain a separate Python ML service, Prisma schema, Dockerfile, MQTT broker service, or Wokwi project because none exists in the current RespiraFi implementation. The current ML logic is implemented in the TypeScript server Coach/intensity layer, and the IoT path is represented by the authenticated telemetry simulator/API.

## Prerequisites

- Node.js 22 or compatible modern Node.js runtime
- pnpm 10
- MySQL or TiDB database
- Manus OAuth credentials/runtime configuration for authenticated flows
- Optional S3-compatible storage and built-in Manus API configuration

## Local setup

```bash
pnpm install
cp .env.example .env
# Fill .env with local values; never commit .env.
pnpm db:push
pnpm dev
```

The development server runs on the configured local port and serves the Vite frontend through the Express runtime.

## Environment variables

See `.env.example` for placeholders. Core configuration includes:

- `DATABASE_URL` — MySQL/TiDB connection string
- `JWT_SECRET` — session signing secret
- `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` — Manus OAuth configuration
- `OWNER_OPEN_ID`, `OWNER_NAME` — owner metadata
- `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` — server-side Manus built-in API access
- `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY` — frontend built-in API access where required
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` — optional external provider placeholders; the current implementation uses the configured Manus LLM helper rather than requiring these keys
- `MQTT_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD` — reserved placeholders for an external MQTT bridge; the current repository uses the built-in telemetry simulator/API

Never place real credentials in source files, README content, migrations, or commits.

## Database

The project uses Drizzle ORM, not Prisma. The schema is in `drizzle/schema.ts`, relations are in `drizzle/relations.ts`, and additive SQL migrations are in `drizzle/`.

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
# Or use the project convenience script:
pnpm db:push
```

The database includes authenticated users, profiles, telemetry, simulator state, alerts, workout history, conversations, and persisted weekly plans.

## AI Coach and weekly planning

The Coach flow resolves the current user profile, local timezone, current date, requested temporal reference, persisted weekly-plan row, completion/missed state, telemetry-derived ML signals, recovery, and preferences before rendering a response. Explicit weekday requests override earlier conversation references, and planned rest rows return recovery guidance rather than a generated workout.

Relevant files:

- `server/coachServices.ts`
- `server/routers.ts`
- `server/db.ts`
- `drizzle/schema.ts`
- `client/src/pages/Home.tsx`

## Telemetry and IoT integration

The current repository includes authenticated telemetry and simulator procedures for IoT-compatible data. A future ESP32/Wokwi or MQTT bridge can post normalized telemetry through the existing backend contract. No external broker credentials or Wokwi files are included in this export because they are not part of the current working source.

## Tests

```bash
pnpm check
pnpm test
```

The suite covers intensity scoring, workout lifecycle, safety decisions, Coach personalization, temporal context, weekly plan generation, stored-row selection, rest days, onboarding, authentication boundaries, and user-scoped behavior.

## Production build

```bash
pnpm build
pnpm start
```

The build produces the frontend bundle and bundled Node.js server under `dist/`.

## Security and excluded files

The repository excludes environment files containing credentials, dependency directories, build output, logs, local databases, coverage output, IDE metadata, Manus project metadata, and other generated/private artifacts. Use `.env.example` as the safe starting point for local configuration.

## Deployment

The current managed deployment is hosted through Manus WebDev. Deployment-specific credentials and platform metadata are intentionally not exported. For independent deployment, provide the required environment variables, provision MySQL/TiDB, run migrations, build, and start the Node.js server.
