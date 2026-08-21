/**
 * API Route: POST /api/plans/[planId]/archive
 * Archiva un plan: queda oculto de "Mis Planes" pero conserva todo su
 * historial de entrenamientos. Si el plan estaba activo, además se cancela
 * para que no siga apareciendo como plan en curso en el dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
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

    const wasActive = plan.status === 'ACTIVE' || plan.status === 'PAUSED';
    const updated = await prisma.plan.update({
      where: { id: plan.id },
      data: {
        archivedAt: new Date(),
        ...(wasActive ? { status: 'CANCELLED', endDate: new Date() } : {}),
      },
    });

    return NextResponse.json({ plan: updated });
  } catch (error) {
    console.error('Error en POST /api/plans/[planId]/archive:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
