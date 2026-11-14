/**
 * API Route: POST /api/plans/manual
 * Crea un plan armado a mano (sin IA): solo el esqueleto de la semana —
 * los días elegidos quedan como días de entrenamiento vacíos y el resto como
 * descanso. Los ejercicios se agregan después desde el modo edición del plan.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { savePlanToDatabase } from '@/lib/ai/save-plan';
import { ManualPlanRequestSchema } from '@/lib/ai/schemas';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado. Iniciá sesión para continuar.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const validation = ManualPlanRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, goal, durationWeeks, trainingDays } = validation.data;
    const sortedDays = [...trainingDays].sort((a, b) => a - b);

    // Misma forma que un plan generado por IA, así se guarda por el mismo
    // camino (incluida la invariante de un solo plan ACTIVE).
    const plan = await savePlanToDatabase(
      session.user.id,
      {
        userId: session.user.id,
        goal,
        durationWeeks,
        daysPerWeek: sortedDays.length,
        split: 'custom',
      },
      {
        planName: name,
        description: 'Plan armado a mano',
        days: [1, 2, 3, 4, 5, 6, 7].map((dayNumber) => {
          const trainingIndex = sortedDays.indexOf(dayNumber);
          return trainingIndex === -1
            ? { dayNumber, name: 'Descanso', isRest: true, exercises: [] }
            : { dayNumber, name: `Día ${trainingIndex + 1}`, isRest: false, exercises: [] };
        }),
      }
    );

    return NextResponse.json({ success: true, plan }, { status: 201 });
  } catch (error) {
    console.error('[API /plans/manual] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
