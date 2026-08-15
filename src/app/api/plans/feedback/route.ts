import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { generateTrainingPlan } from '@/lib/ai/generate-plan';
import { savePlanToDatabase } from '@/lib/ai/save-plan';

const FeedbackSchema = z.object({
  planId: z.string().min(1),
  difficulty: z.enum(['TOO_EASY', 'EASY', 'JUST_RIGHT', 'HARD', 'TOO_HARD']),
  notes: z.string().optional(),
  muscleGroupFeedback: z.array(z.string()).optional(),
});

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

    // Generar nuevo plan basado en el anterior
    let newPlanId: string | null = null;

    try {
      // Obtener perfil del usuario para la generación
      const profile = await prisma.profile.findUnique({
        where: { userId: session.user.id },
      });

      const generatedPlan = await generateTrainingPlan({
        userId: session.user.id,
        goal: plan.goal,
        durationWeeks: plan.durationWeeks,
        daysPerWeek: plan.daysPerWeek,
        split: plan.split,
        previousPlanId: planId,
      });

      if (!generatedPlan.success) {
        throw new Error(generatedPlan.error);
      }

      const savedPlan = await savePlanToDatabase(
        session.user.id,
        {
          userId: session.user.id,
          goal: plan.goal,
          durationWeeks: plan.durationWeeks,
          daysPerWeek: plan.daysPerWeek,
          split: plan.split,
        },
        generatedPlan.plan
      );

      newPlanId = savedPlan.id;
    } catch (aiError) {
      console.error('Error generando nuevo plan:', aiError);
      // No fallar la request — el feedback ya se guardó
      // El usuario puede generar un plan manualmente después
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback guardado correctamente',
      newPlanId,
    });
  } catch (error) {
    console.error('Error en POST /api/plans/feedback:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
