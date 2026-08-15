/**
 * API Route: POST /api/plans/[planId]/activate
 * Marca el plan como el activo del usuario: pausa cualquier otro plan
 * ACTIVE que tuviera y reinicia la fecha de inicio a "ahora".
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

    const updatedPlan = await prisma.$transaction(async (tx) => {
      await tx.plan.updateMany({
        where: {
          userId: session.user.id,
          status: 'ACTIVE',
          id: { not: plan.id },
        },
        data: { status: 'PAUSED' },
      });

      return tx.plan.update({
        where: { id: plan.id },
        data: { status: 'ACTIVE', startDate: new Date() },
      });
    });

    return NextResponse.json({ success: true, plan: updatedPlan });
  } catch (error) {
    console.error('Error en POST /api/plans/[planId]/activate:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
