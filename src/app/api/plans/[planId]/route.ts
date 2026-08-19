/**
 * API Route: GET /api/plans/[planId]
 * Devuelve un plan con sus días y ejercicios, verificando que pertenezca al usuario.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const plan = await prisma.plan.findFirst({
      where: {
        id: params.planId,
        userId: session.user.id,
      },
      include: {
        planDays: {
          orderBy: { dayNumber: 'asc' },
          include: {
            exercises: {
              // El cliente (plan/[id]/page.tsx) además filtra y ordena por
              // fase antes de mostrar, pero traerlo ya así evita depender de
              // eso en cualquier otro consumidor futuro de este endpoint.
              orderBy: [{ phase: 'asc' }, { order: 'asc' }],
              include: {
                exercise: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    gifUrl: true,
                    target: true,
                    equipment: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Error en GET /api/plans/[planId]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/plans/[planId]
 * Si el plan nunca registró entrenamientos, lo borra por completo.
 * Si ya tiene historial (WorkoutSession asociadas), lo cancela en su lugar
 * para no perder los datos registrados.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const plan = await prisma.plan.findFirst({
      where: { id: params.planId, userId: session.user.id },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    const sessionCount = await prisma.workoutSession.count({
      where: { planDay: { planId: plan.id } },
    });

    if (sessionCount > 0) {
      const updated = await prisma.plan.update({
        where: { id: plan.id },
        data: { status: 'CANCELLED', endDate: new Date() },
      });
      return NextResponse.json({ action: 'cancelled', plan: updated });
    }

    await prisma.plan.delete({ where: { id: plan.id } });
    return NextResponse.json({ action: 'deleted' });
  } catch (error) {
    console.error('Error en DELETE /api/plans/[planId]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
