import { prisma } from './prisma';

/**
 * Verifica si un plan ha sido completado (todas las semanas entrenadas)
 */
async function checkPlanCompletion(planId: string): Promise<boolean> {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      planDays: {
        where: { isRest: false },
      },
    },
  });

  if (!plan) return false;

  const trainingDaysPerWeek = plan.planDays.length;
  const totalExpectedSessions = trainingDaysPerWeek * plan.durationWeeks;

  const completedSessions = await prisma.workoutSession.count({
    where: {
      planDay: { planId },
      completedAt: { not: null },
    },
  });

  // Plan completo si se hicieron al menos 80% de las sesiones esperadas
  return completedSessions >= totalExpectedSessions * 0.8;
}

/**
 * Obtiene estadísticas del plan completado.
 * Requiere userId para verificar que el plan pertenece al usuario que lo solicita.
 */
export async function getPlanStats(planId: string, userId: string) {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId },
    include: {
      planDays: {
        where: { isRest: false },
      },
    },
  });

  if (!plan) return null;

  const sessions = await prisma.workoutSession.findMany({
    where: {
      planDay: { planId },
      completedAt: { not: null },
    },
    include: {
      sets: {
        where: { completed: true },
      },
    },
  });

  // Volumen total (sets × reps × peso)
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;

  sessions.forEach((session) => {
    session.sets.forEach((set) => {
      // Toda serie completada cuenta para sets/reps; el peso solo afecta el
      // volumen (las series de peso corporal tienen weight null/0).
      totalSets++;
      if (set.reps) {
        totalReps += set.reps;
        if (set.weight) {
          totalVolume += set.weight * set.reps;
        }
      }
    });
  });

  // Duración total (suma de duración de cada sesión)
  let totalDurationMinutes = 0;
  sessions.forEach((session) => {
    if (session.completedAt && session.startedAt) {
      const diff = session.completedAt.getTime() - session.startedAt.getTime();
      totalDurationMinutes += diff / (1000 * 60);
    }
  });

  // Semanas distintas entrenadas
  const weeksCompleted = new Set(sessions.map((s) => s.weekNumber)).size;

  // Completion rate
  const trainingDaysPerWeek = plan.planDays.length;
  const totalExpectedSessions = trainingDaysPerWeek * plan.durationWeeks;
  const completionRate = Math.round((sessions.length / totalExpectedSessions) * 100);

  return {
    planName: plan.name,
    goal: plan.goal,
    durationWeeks: plan.durationWeeks,
    weeksCompleted,
    totalSessions: sessions.length,
    totalExpectedSessions,
    completionRate,
    totalVolume: Math.round(totalVolume),
    totalSets,
    totalReps,
    totalDurationMinutes: Math.round(totalDurationMinutes),
    startDate: plan.startDate,
    endDate: plan.endDate,
  };
}

/**
 * Verifica si el usuario tiene un plan activo que ya se completó
 * y debería recibir el prompt de feedback
 */
export async function shouldPromptFeedback(userId: string): Promise<{
  shouldPrompt: boolean;
  planId?: string;
  planName?: string;
}> {
  // Buscar plan activo del usuario
  const activePlan = await prisma.plan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
    },
    include: {
      feedback: true,
      planDays: {
        where: { isRest: false },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!activePlan) {
    return { shouldPrompt: false };
  }

  // Si ya tiene feedback, no preguntar de nuevo
  if (activePlan.feedback.length > 0) {
    return { shouldPrompt: false };
  }

  // Verificar si la fecha de fin ya pasó
  if (activePlan.endDate && new Date() > activePlan.endDate) {
    return {
      shouldPrompt: true,
      planId: activePlan.id,
      planName: activePlan.name,
    };
  }

  // Verificar si completó todas las semanas
  const isComplete = await checkPlanCompletion(activePlan.id);
  if (isComplete) {
    return {
      shouldPrompt: true,
      planId: activePlan.id,
      planName: activePlan.name,
    };
  }

  return { shouldPrompt: false };
}
