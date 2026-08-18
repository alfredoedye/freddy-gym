/**
 * API Route: POST /api/plans/generate
 * Genera un plan de entrenamiento usando IA y lo persiste en la DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateTrainingPlan } from '@/lib/ai/generate-plan';
import { savePlanToDatabase } from '@/lib/ai/save-plan';
import { GeneratePlanRequestSchema } from '@/lib/ai/schemas';

// La generación reintenta hasta 3 veces contra el LLM (ver MAX_RETRIES en generate-plan.ts),
// y el presupuesto de tokens/tiempo por llamada escala con daysPerWeek — un plan de 6 días
// necesita llamadas más largas que uno de 3 (ver maxTokensFor/timeoutMsFor). 120s alcanzaba
// para 3 días pero dejaba a los planes de más días sin margen para más de un intento largo.
export const maxDuration = 280;

// Guard de idempotencia: si el usuario ya tiene un plan creado hace menos de
// esto, un nuevo POST devuelve ese plan en vez de generar (y facturar) otro.
// Cubre el caso real de móvil: el fetch muere ("Load failed") pero el server
// terminó y guardó — el reintento del usuario no debe duplicar el plan.
const RECENT_PLAN_WINDOW_MS = 2 * 60 * 1000;

// Tope diario de generaciones por usuario — control de costo del LLM.
const MAX_GENERATIONS_PER_DAY = 10;

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado. Iniciá sesión para continuar.' },
        { status: 401 }
      );
    }

    // 1b. Idempotencia y límite de costo
    const recentPlan = await prisma.plan.findFirst({
      where: {
        userId: session.user.id,
        createdAt: { gt: new Date(Date.now() - RECENT_PLAN_WINDOW_MS) },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (recentPlan) {
      return NextResponse.json(
        {
          error: 'Ya generaste un plan hace un momento.',
          existingPlanId: recentPlan.id,
        },
        { status: 409 }
      );
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const plansToday = await prisma.plan.count({
      where: { userId: session.user.id, createdAt: { gte: startOfDay } },
    });

    if (plansToday >= MAX_GENERATIONS_PER_DAY) {
      return NextResponse.json(
        { error: 'Alcanzaste el límite de planes generados por hoy. Probá de nuevo mañana.' },
        { status: 429 }
      );
    }

    // 2. Parsear y validar body
    const body = await request.json();
    const validation = GeneratePlanRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { goal, durationWeeks, daysPerWeek, split, timePerSession, previousPlanId } =
      validation.data;

    // 2b. Si se indicó un plan anterior, verificar que pertenece al usuario
    // (previousPlanId viene del cliente — sin esto, cualquier usuario podría leer
    // el progreso de otro y marcar su plan como completado)
    if (previousPlanId) {
      const previousPlan = await prisma.plan.findFirst({
        where: { id: previousPlanId, userId: session.user.id },
        select: { id: true },
      });

      if (!previousPlan) {
        return NextResponse.json({ error: 'Plan anterior no encontrado' }, { status: 404 });
      }
    }

    // 3. Generar plan con IA
    const result = await generateTrainingPlan({
      userId: session.user.id,
      goal,
      durationWeeks,
      daysPerWeek,
      split,
      timePerSession,
      previousPlanId,
    });

    if (!result.success) {
      console.error('[API /plans/generate] Fallo generación:', result.error, result.details);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // 4. Guardar en la base de datos
    const savedPlan = await savePlanToDatabase(
      session.user.id,
      { userId: session.user.id, goal, durationWeeks, daysPerWeek, split, previousPlanId },
      result.plan
    );

    // 5. Responder con el plan completo
    return NextResponse.json(
      {
        success: true,
        plan: savedPlan,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API /plans/generate] Error:', error);

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
