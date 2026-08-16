import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

const FeedbackSchema = z.object({
  planId: z.string().min(1),
  difficulty: z.enum(['TOO_EASY', 'EASY', 'JUST_RIGHT', 'HARD', 'TOO_HARD']),
  notes: z.string().max(2000).optional(),
  muscleGroupFeedback: z.array(z.string().max(50)).max(20).optional(),
});

// Esta ruta solo guarda el feedback y cierra el plan — responde rápido.
// La generación del plan siguiente (30s+ de LLM) se dispara aparte desde
// /plan/create con previousPlanId: si la generación falla o se corta la
// conexión, el feedback ya quedó guardado y el usuario tiene una UI de
// reintento, en vez de aterrizar en un dashboard vacío sin explicación.
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = FeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { planId, difficulty, notes, muscleGroupFeedback } = parsed.data;

    // Verificar que el plan pertenece al usuario
    const plan = await prisma.plan.findFirst({
      where: {
        id: planId,
        userId: session.user.id,
      },
      include: {
        feedback: true,
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan no encontrado' },
        { status: 404 }
      );
    }

    if (plan.feedback.length > 0) {
      return NextResponse.json(
        { error: 'Este plan ya tiene feedback registrado' },
        { status: 409 }
      );
    }

    // Guardar feedback y marcar plan como completado (transacción)
    const feedbackNotes = [
      notes,
      muscleGroupFeedback?.length
        ? `Grupos musculares difíciles: ${muscleGroupFeedback.join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join('. ');

    await prisma.$transaction([
      prisma.planFeedback.create({
        data: {
          planId,
          difficulty,
          notes: feedbackNotes || null,
        },
      }),
      prisma.plan.update({
        where: { id: planId },
        data: {
          status: 'COMPLETED',
          endDate: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Feedback guardado correctamente',
    });
  } catch (error) {
    console.error('Error en POST /api/plans/feedback:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
