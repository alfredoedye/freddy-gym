import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Punto de entrada de "Entrenar" en la navegación inferior.
 * Redirige al próximo día de entrenamiento del plan activo (misma lógica que el dashboard).
 */
export default async function WorkoutIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  const userId = session.user.id;

  const activePlan = await prisma.plan.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: {
      planDays: {
        where: { isRest: false },
        orderBy: { dayNumber: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!activePlan || activePlan.planDays.length === 0) {
    redirect('/plan/create');
  }

  const lastSession = await prisma.workoutSession.findFirst({
    where: { userId, completedAt: { not: null } },
    include: { planDay: true },
    orderBy: { completedAt: 'desc' },
  });

  let nextDay = activePlan.planDays[0];
  if (lastSession?.planDay) {
    const lastDayNumber = lastSession.planDay.dayNumber;
    const nextDayInPlan = activePlan.planDays.find((d) => d.dayNumber > lastDayNumber);
    nextDay = nextDayInPlan || activePlan.planDays[0];
  }

  redirect(`/workout/${nextDay.id}`);
}
