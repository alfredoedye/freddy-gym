import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { calculateAge } from '@/lib/date-utils';

// Schema de validación para crear/actualizar perfil
const profileSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  birthDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Fecha de nacimiento inválida')
    .refine((val) => {
      const age = calculateAge(new Date(val));
      return age >= 14 && age <= 80;
    }, 'Debés tener entre 14 y 80 años'),
  sex: z.enum(['MALE', 'FEMALE']),
  height: z.number().min(100).max(230),
  weight: z.number().min(30).max(200),
  goal: z.enum(['HYPERTROPHY', 'STRENGTH', 'ENDURANCE', 'FAT_LOSS', 'RECOMPOSITION']),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
});

// GET — Obtener perfil del usuario actual
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
  }

  return NextResponse.json(profile);
}

// POST — Crear perfil
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Verificar que no tenga ya un perfil
  const existing = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  if (existing) {
    return NextResponse.json({ error: 'Ya tenés un perfil creado' }, { status: 409 });
  }

  const body = await request.json();
  const parsed = profileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, birthDate, sex, height, weight, goal, level } = parsed.data;

  // Actualizar nombre del usuario y crear perfil en una transacción
  const profile = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: { name },
    });

    return tx.profile.create({
      data: {
        userId: session.user.id,
        birthDate: new Date(birthDate),
        sex,
        height,
        weight,
        goal,
        level,
      },
    });
  });

  return NextResponse.json(profile, { status: 201 });
}

// PUT — Actualizar perfil
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profileSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, birthDate, ...profileData } = parsed.data;

  const profile = await prisma.$transaction(async (tx) => {
    if (name) {
      await tx.user.update({
        where: { id: session.user.id },
        data: { name },
      });
    }

    return tx.profile.update({
      where: { userId: session.user.id },
      data: {
        ...profileData,
        ...(birthDate ? { birthDate: new Date(birthDate) } : {}),
      },
    });
  });

  return NextResponse.json(profile);
}
