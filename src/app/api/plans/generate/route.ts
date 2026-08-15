/**
 * API Route: POST /api/plans/generate
 * Genera un plan de entrenamiento usando IA y lo persiste en la DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateTrainingPlan } from '@/lib/ai/generate-plan';
import { savePlanToDatabase } from '@/lib/ai/save-plan';
import { GeneratePlanRequestSchema } from '@/lib/ai/schemas';

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
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: 500 }
      );
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

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
