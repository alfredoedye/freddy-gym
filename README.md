# GymApp — Tu Entrenador Personal

Web app de entrenamiento de gimnasio, mobile-first e instalable (PWA), con planes de entrenamiento generados por IA a partir del perfil y el historial real del usuario. Diseñada para usarse *en* el gimnasio: alto contraste, objetivos táctiles grandes, cero fricción entre series.

Producción: **https://freddy-gym.vercel.app**

## Funcionalidad

- **Planes con IA**: genera un plan de 7 días (con calentamiento/enfriamiento) según objetivo, nivel, días por semana y split, usando el perfil y el progreso de planes anteriores (récords, pesos promedio, feedback) como contexto.
- **Ejecución guiada**: pantalla de entrenamiento serie por serie, con temporizador de descanso, registro de peso/reps/RPE y navegación a "siguiente ejercicio" con un tap.
- **Progreso**: volumen semanal, frecuencia, rachas y récords personales por ejercicio.
- **Gestión de planes**: historial completo, edición de series/reps/descanso, reemplazo de ejercicios y cancelación/borrado de un plan.
- **Perfil**: datos personales, objetivo/nivel, tema claro/oscuro, tamaño de letra (accesibilidad) e instalación de la app.
- **Instalable (PWA)**: ícono en la pantalla de inicio, sin barra de navegador, y cacheo de GIFs de ejercicios para verlos sin señal en el gym.

## Stack Tecnológico

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Estilos/UI**: Tailwind CSS v3 + shadcn/ui (Radix primitives)
- **Base de datos**: PostgreSQL (Neon en producción, Docker en local) vía Prisma ORM
- **Autenticación**: NextAuth.js (Credenciales + Google OAuth opcional)
- **IA**: [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) (paquete `ai` v6) — modelo configurable vía `AI_GATEWAY_MODEL` (ej. `anthropic/claude-sonnet-5`)
- **Despliegue**: Vercel, auto-deploy en cada push a `main`

## Inicio Rápido

### 1. Base de datos local

```bash
docker run -e POSTGRES_USER=gymapp -e POSTGRES_PASSWORD=gymapp -e POSTGRES_DB=gymapp -p 5434:5432 postgres:17-alpine
```

### 2. Variables de entorno

No hay `.env.example` versionado. Creá un `.env` con:

```bash
DATABASE_URL="postgresql://gymapp:gymapp@localhost:5434/gymapp?schema=public"

NEXTAUTH_SECRET="<generá uno con: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"   # debe matchear el puerto real en el que corre la app

# Opcional — dejar en blanco deshabilita el botón de Google
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# IA vía Vercel AI Gateway
AI_GATEWAY_MODEL="anthropic/claude-sonnet-5"
```

Para que la generación de planes funcione localmente hace falta además un `VERCEL_OIDC_TOKEN` (provisto por `vercel env pull .env.local`, ver sección IA más abajo).

### 3. Instalar, migrar y sembrar datos

```bash
npm install
npx prisma migrate dev
npx prisma db seed        # carga prisma/data/exercises.json (~1300 ejercicios)
```

### 4. Crear un usuario

No hay registro por invitación abierta salvo `/auth/register`; para crear uno directo en la DB:

```bash
EMAIL=tu@email.com NAME="Tu Nombre" PASSWORD=tuPassword npx tsx scripts/create-user.ts
```

### 5. Correr en desarrollo

```bash
npm run dev          # o: npm run dev -- -p <puerto>, si el 3000 está ocupado
```

## IA (Vercel AI Gateway)

La generación de planes llama al LLM a través de AI Gateway, autenticado por OIDC en vez de una API key propia:

```bash
vercel link                    # una vez, conecta el repo al proyecto de Vercel
vercel env pull .env.local      # provisiona VERCEL_OIDC_TOKEN (válido ~24h)
```

Cuando el token expira, repetí `vercel env pull .env.local --yes`. En producción (Vercel) el token se renueva solo.

## Instalar la app en el celular

1. Entrá a **https://freddy-gym.vercel.app** desde el navegador y logueate.
2. **Android/Chrome**: debería aparecer un banner para instalar; si no, menú ⋮ → "Instalar app". Si se te pasó el aviso, en **Perfil → Instalar app** hay un botón para disparar la instalación de nuevo.
3. **iPhone/Safari**: no hay banner automático (limitación de iOS) — botón Compartir → "Agregar a pantalla de inicio".

## Diseño

Sistema propio ("The Charged Set", ver `DESIGN.md`): superficie casi negra y cálida (Ink) con un único acento eléctrico lima (Volt, `#D4FF3D`) reservado para los momentos que importan — CTA activo, anillo de descanso, badge de PR — nunca decorativo. Modo claro disponible. Tipografía Space Grotesk (display) + Inter (cuerpo) + Space Mono (números/labels). Objetivos táctiles de 48–56px pensados para usarse con poca luz y manos sudadas entre series.

## Estructura del Proyecto

```
freddy-gym/
├── prisma/
│   ├── schema.prisma              # User → Profile, Plan → PlanDay → PlanExercise/WorkoutSession
│   ├── migrations/
│   ├── seed.ts
│   └── data/exercises.json        # ~1300 ejercicios (catálogo)
├── scripts/
│   ├── create-user.ts             # crear usuario inicial desde CLI
│   └── generate-icons.mjs         # genera los íconos de public/icons/ (PWA)
├── src/
│   ├── app/
│   │   ├── layout.tsx             # layout raíz: theme, font-size, service worker
│   │   ├── page.tsx               # Dashboard
│   │   ├── auth/                  # login / register
│   │   ├── onboarding/            # alta de perfil
│   │   ├── plan/                  # crear, ver, historial y feedback de planes
│   │   ├── workout/               # ejecución de un entrenamiento
│   │   ├── exercises/             # catálogo de ejercicios
│   │   ├── progress/              # volumen, frecuencia, PRs
│   │   ├── profile/               # datos, accesibilidad, instalar PWA, logout
│   │   └── api/                   # rutas de API colocadas junto a cada dominio
│   ├── components/                # ui/ (shadcn), layout/, workout/, plan/, progress/, exercises/
│   ├── hooks/                     # useWorkout (máquina de estado de una sesión)
│   ├── lib/
│   │   ├── ai/                    # generate-plan, prompts, schemas (Zod), client (AI Gateway), save-plan
│   │   ├── exercises.ts, progress.ts, plan-completion.ts
│   │   └── auth.ts, prisma.ts
│   └── middleware.ts               # protección de rutas + gate de perfil incompleto
├── public/
│   ├── manifest.json, sw.js, icons/  # PWA
├── next.config.js
├── tailwind.config.ts
└── DESIGN.md / PRODUCT.md          # sistema de diseño y lineamientos de producto
```

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (corre el type-check completo) |
| `npm run start` | Servidor de producción |
| `npm run lint` | Lint del código |
| `npx prisma migrate dev --name <name>` | Crear/aplicar una migración |
| `npx prisma generate` | Regenerar el cliente Prisma tras cambios al schema |
| `npx prisma db seed` | Seed de ejercicios |
| `npx prisma studio` | UI para explorar la base de datos |
| `node scripts/generate-icons.mjs` | Regenerar los íconos PWA |
| `npx tsx scripts/create-user.ts` | Crear un usuario directo en la DB |

No hay suite de tests configurada en este repo.

## Despliegue

Vercel + Neon (Postgres), con auto-deploy en cada push a `main`. Las variables de entorno de producción (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AI_GATEWAY_MODEL`) viven en el proyecto de Vercel, no en el repo. Los cambios de esquema requieren correr `npx prisma migrate deploy` contra la `DATABASE_URL` de producción — no se aplican solos en el deploy.

## Licencia

Proyecto privado.
