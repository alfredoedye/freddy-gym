import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WorkoutClient } from './workout-client';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

interface WorkoutPageProps {
  params: { dayId: string };
}

export default async function WorkoutPage({ params }: WorkoutPageProps) {
  // Verificar autenticación
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  const userId = session.user.id;
  const { dayId } = params;

  // Obtener PlanDay con ejercicios
  const planDay = await prisma.planDay.findUnique({
    where: { id: dayId },
    include: {
      exercises: {
        // "order" es un entero por día, no por fase — agregar/reordenar
        // ejercicios en modo edición (ver plan/[id]/page.tsx) puede dejar a un
        // WARMUP con un order más alto que ejercicios MAIN/COOLDOWN (el orden
        // relativo dentro de su fase sigue siendo correcto, pero no el global).
        // Ordenar por fase primero garantiza WARMUP → MAIN → COOLDOWN siempre,
        // sin depender de que los enteros de "order" queden agrupados por fase.
        orderBy: [{ phase: 'asc' }, { order: 'asc' }],
        include: {
          exercise: true,
        },
      },
      plan: {
        select: { id: true, userId: true, startDate: true, durationWeeks: true },
      },
    },
  });

  // Verificar que existe y pertenece al usuario
  if (!planDay || planDay.plan.userId !== userId) {
    redirect('/');
  }

  // Si es día de descanso, redirigir
  if (planDay.isRest) {
    redirect('/');
  }

  // Semana actual del plan, calculada desde su fecha de inicio (acotada a
  // [1, durationWeeks]). Antes venía de ?week=, que ningún caller pasaba —
  // toda sesión quedaba en "semana 1" y el prefill de pesos nunca encontraba
  // una sesión "anterior".
  const weeksSinceStart = Math.floor(
    (Date.now() - planDay.plan.startDate.getTime()) / MS_PER_WEEK
  );
  const weekNumber = Math.min(Math.max(weeksSinceStart + 1, 1), planDay.plan.durationWeeks);

  const sessionKey = { userId, planDayId: dayId, weekNumber };

  // Buscar o crear la WorkoutSession de este día/semana. El índice único
  // userId+planDayId+weekNumber garantiza que dos cargas simultáneas no
  // creen sesiones duplicadas: la que pierde la carrera recibe P2002 y
  // relee la fila ganadora.
  let workoutSession = await prisma.workoutSession.findUnique({
    where: { userId_planDayId_weekNumber: sessionKey },
    include: { sets: true },
  });

  if (workoutSession?.completedAt) {
    // Este día/semana ya se entrenó — mostrar el resumen en vez de una
    // pantalla de ejecución que la API va a rechazar.
    redirect(`/workout/${dayId}/complete?sessionId=${workoutSession.id}`);
  }

  if (!workoutSession) {
    try {
      workoutSession = await prisma.workoutSession.create({
        data: sessionKey,
        include: { sets: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        workoutSession = await prisma.workoutSession.findUnique({
          where: { userId_planDayId_weekNumber: sessionKey },
          include: { sets: true },
        });
      }
      if (!workoutSession) throw error;
    }
  }

  // Sets de la última sesión completada de este día — sin importar la semana,
  // para que el prefill de pesos sobreviva semanas salteadas.
  const previousSession = await prisma.workoutSession.findFirst({
    where: {
      userId,
      planDayId: dayId,
      completedAt: { not: null },
    },
    include: {
      sets: {
        where: { completed: true },
      },
    },
    orderBy: { completedAt: 'desc' },
  });

  // Mapear datos para el cliente
  const exercisesData = planDay.exercises.map((pe) => ({
    id: pe.id,
    exerciseId: pe.exerciseId,
    order: pe.order,
    phase: pe.phase,
    sets: pe.sets,
    repsMin: pe.repsMin,
    repsMax: pe.repsMax,
    restSeconds: pe.restSeconds,
    notes: pe.notes,
    exercise: {
      id: pe.exercise.id,
      name: pe.exercise.name,
      bodyPart: pe.exercise.bodyPart,
      equipment: pe.exercise.equipment,
      target: pe.exercise.target,
      muscleGroup: pe.exercise.muscleGroup,
      imageUrl: pe.exercise.imageUrl,
      gifUrl: pe.exercise.gifUrl,
      instructionsEs: pe.exercise.instructionsEs,
    },
  }));

  const existingSets = workoutSession.sets.map((s) => ({
    id: s.id,
    exerciseId: s.exerciseId,
    setNumber: s.setNumber,
    reps: s.reps,
    weight: s.weight,
    completed: s.completed,
    rpe: s.rpe,
    completedAt: s.completedAt?.toISOString() || null,
  }));

  const previousSets = (previousSession?.sets || []).map((s) => ({
    id: s.id,
    exerciseId: s.exerciseId,
    setNumber: s.setNumber,
    reps: s.reps,
    weight: s.weight,
    completed: s.completed,
    rpe: s.rpe,
    completedAt: s.completedAt?.toISOString() || null,
  }));

  return (
    <WorkoutClient
      planDay={{
        id: planDay.id,
        name: planDay.name,
        planId: planDay.plan.id,
      }}
      exercises={exercisesData}
      session={{
        id: workoutSession.id,
        weekNumber,
        startedAt: workoutSession.startedAt.toISOString(),
      }}
      existingSets={existingSets}
      previousSets={previousSets}
    />
  );
}
