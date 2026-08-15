# 🏋️ GymApp - Tu Entrenador Personal

Aplicación web de entrenamiento de gimnasio con IA. Diseño mobile-first, interfaz en español, modo claro/oscuro.

## Stack Tecnológico

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Estilos**: Tailwind CSS (mobile-first, dark/light toggle)
- **Base de datos**: PostgreSQL (Neon) + Prisma ORM
- **Autenticación**: NextAuth.js (Credenciales + Google OAuth)
- **IA**: OpenAI / Anthropic SDK para generación de planes
- **UI**: Lucide React (iconos), next-themes (tema)

## Inicio Rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Edita .env con tus valores reales
```

### 3. Configurar base de datos

```bash
# Crear las tablas en la base de datos
npx prisma migrate dev --name init

# (Opcional) Abrir Prisma Studio para ver los datos
npx prisma studio
```

### 4. Seed de ejercicios

Coloca tu archivo `exercises.json` en `prisma/data/exercises.json`, luego:

```bash
npx prisma db seed
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

La app estará disponible en [http://localhost:3000](http://localhost:3000)

## Estructura del Proyecto

```
gym-app/
├── prisma/
│   ├── schema.prisma        # Esquema de base de datos
│   ├── seed.ts              # Script de seed
│   └── data/
│       └── exercises.json   # Datos de ejercicios
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Layout raíz
│   │   ├── page.tsx         # Dashboard (Inicio)
│   │   ├── globals.css      # Estilos globales
│   │   ├── auth/
│   │   │   ├── login/       # Página de login
│   │   │   └── register/    # Página de registro
│   │   ├── exercises/       # Catálogo de ejercicios
│   │   └── workout/
│   │       └── [dayId]/     # Ejecución de entrenamiento
│   ├── components/
│   │   ├── layout/
│   │   │   ├── header.tsx   # Header superior
│   │   │   └── bottom-nav.tsx # Navegación inferior
│   │   └── ui/
│   │       └── theme-toggle.tsx # Toggle claro/oscuro
│   ├── hooks/
│   │   └── useTimer.ts     # Hook de temporizador
│   ├── lib/
│   │   ├── prisma.ts       # Cliente Prisma singleton
│   │   └── auth.ts         # Configuración NextAuth
│   └── types/
│       └── index.ts        # Tipos compartidos
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
├── postcss.config.js
└── .env.example
```

## Diseño

- **Mobile-first**: Optimizado para uso en el gimnasio con el móvil
- **Touch targets**: Mínimo 48px en todos los elementos interactivos
- **Tipografía**: Base 16px, inputs y botones en 18px
- **Colores**: Violeta vibrante (#7c3aed) como acento, verde para completado
- **Temas**: Claro (fondo #fafafa) y oscuro (fondo #0f0f0f)

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | Lint del código |
| `npx prisma migrate dev` | Aplicar migraciones |
| `npx prisma db seed` | Seed de datos |
| `npx prisma studio` | UI para la BD |

## Licencia

Proyecto privado.
