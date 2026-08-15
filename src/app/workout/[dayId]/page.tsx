import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WorkoutClient } from './workout-client';

interface WorkoutPageProps {
  params: { dayId: string };
  searchParams: { week?: string };
}

export default async function WorkoutPage({ params, searchParams }: WorkoutPageProps) {
  // Verificar autenticación
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  const userId = session.user.id;
  const { dayId } = params;
  const weekNumber = parseInt(searchParams.week || '1');

  // Obtener PlanDay con ejercicios
  const planDay = await prisma.planDay.findUnique({
    where: { id: dayId },
    include: {
      exercises: {
        orderBy: { order: 'asc' },
        include: {
          exercise: true,
        },
      },
      plan: {
        select: { id: true, userId: true },
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

  // Buscar o crear WorkoutSession para este día y semana
  let workoutSession = await prisma.workoutSession.findFirst({
    where: {
      userId,
      planDayId: dayId,
      weekNumber,
      completedAt: null, // Solo sesiones no completadas
    },
    include: {
      sets: true,
    },
  });

  if (!workoutSession) {
    workoutSession = await prisma.workoutSession.create({
      data: {
        userId,
        planDayId: dayId,
        weekNumber,
      },
      include: {
        sets: true,
      },
    });
  }

  // Buscar sets de la sesión anterior (para pre-popular pesos)
  const previousSession = await prisma.workoutSession.findFirst({
    where: {
      userId,
      planDayId: dayId,
      weekNumber: weekNumber - 1,
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
      }}
      existingSets={existingSets}
      previousSets={previousSets}
    />
  );
}
