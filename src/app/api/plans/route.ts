/**
 * API Route: GET /api/plans
 * Devuelve todos los planes del usuario (activo + historial), ordenados
 * con el activo primero y luego los demás por fecha de creación descendente.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const STATUS_ORDER: Record<string, number> = {
  ACTIVE: 0,
  PAUSED: 1,
  COMPLETED: 2,
  CANCELLED: 3,
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const plans = await prisma.plan.findMany({
      // Los archivados no se listan — se archivan justamente para sacarlos
      // de la vista sin perder su historial.
      where: { userId: session.user.id, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const sorted = [...plans].sort(
      (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    );

    const result = sorted.map((plan) => {
      let progress = 0;
      if (plan.status === 'COMPLETED') {
        progress = 100;
      } else if (plan.status === 'ACTIVE' || plan.status === 'PAUSED') {
        const diffMs = Date.now() - plan.startDate.getTime();
        const currentWeek = Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
        progress = Math.min(100, Math.round((currentWeek / plan.durationWeeks) * 100));
      }

      return {
        id: plan.id,
        name: plan.name,
        goal: plan.goal,
        durationWeeks: plan.durationWeeks,
        daysPerWeek: plan.daysPerWeek,
        split: plan.split,
        status: plan.status,
        startDate: plan.startDate,
        progress,
      };
    });

    return NextResponse.json({ plans: result });
  } catch (error) {
    console.error('Error en GET /api/plans:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
