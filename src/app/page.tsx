import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { shouldPromptFeedback } from '@/lib/plan-completion';
import { DashboardClient } from './dashboard-client';

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  const userId = session.user.id;

  // Verificar si hay plan completado pendiente de feedback
  const feedbackStatus = await shouldPromptFeedback(userId);

  // Obtener plan activo
  const activePlan = await prisma.plan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
    },
    include: {
      planDays: {
        where: { isRest: false },
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { dayNumber: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Obtener la última sesión para determinar qué día toca
  const lastSession = await prisma.workoutSession.findFirst({
    where: {
      userId,
      completedAt: { not: null },
    },
    include: { planDay: true },
    orderBy: { completedAt: 'desc' },
  });

  // Calcular stats rápidos
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);

  const weekSessions = await prisma.workoutSession.count({
    where: {
      userId,
      completedAt: { not: null },
      startedAt: { gte: thisWeekStart },
    },
  });

  // Streak: semanas consecutivas con al menos una sesión
  const totalSessions = await prisma.workoutSession.count({
    where: {
      userId,
      completedAt: { not: null },
    },
  });

  // Determinar el próximo día de entrenamiento
  let nextDay = activePlan?.planDays[0] || null;
  if (lastSession?.planDay && activePlan) {
    const lastDayNumber = lastSession.planDay.dayNumber;
    const nextDayInPlan = activePlan.planDays.find(
      (d) => d.dayNumber > lastDayNumber
    );
    nextDay = nextDayInPlan || activePlan.planDays[0]; // Volver al inicio si es el último
  }

  // Semana actual del plan
  let currentWeek = 1;
  if (activePlan?.startDate) {
    const diffMs = Date.now() - activePlan.startDate.getTime();
    currentWeek = Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
  }

  return (
    <DashboardClient
      userName={session.user.name || 'Atleta'}
      feedbackStatus={feedbackStatus}
      activePlan={
        activePlan
          ? {
              id: activePlan.id,
              name: activePlan.name,
              durationWeeks: activePlan.durationWeeks,
              daysPerWeek: activePlan.daysPerWeek,
              currentWeek,
            }
          : null
      }
      nextDay={
        nextDay
          ? {
              id: nextDay.id,
              name: nextDay.name,
              dayNumber: nextDay.dayNumber,
              exerciseCount: nextDay.exercises.length,
              exercises: nextDay.exercises.slice(0, 3).map((e) => ({
                name: e.exercise.name,
                target: e.exercise.target,
              })),
            }
          : null
      }
      weekStats={{
        sessionsThisWeek: weekSessions,
        targetPerWeek: activePlan?.daysPerWeek || 0,
        totalSessions,
      }}
    />
  );
}
