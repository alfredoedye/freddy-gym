/**
 * Script de seed para poblar la base de datos con ejercicios.
 * Lee exercises.json y crea los registros en la tabla Exercise.
 *
 * Uso: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Interfaz para los datos crudos del JSON
interface RawExercise {
  id: string;
  name: string;
  category: string;
  equipment: string;
  target: string;
  muscle_group: string;
  secondary_muscles?: string[];
  instructions?: {
    es?: string;
    en?: string;
  };
  media_id?: string;
}

async function main() {
  console.log('🏋️ Iniciando seed de ejercicios...');

  // Leer archivo de ejercicios
  const dataPath = path.join(__dirname, 'data', 'exercises.json');

  if (!fs.existsSync(dataPath)) {
    console.error('❌ No se encontró el archivo exercises.json en prisma/data/');
    console.error('   Coloca el archivo en: prisma/data/exercises.json');
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const exercises: RawExercise[] = JSON.parse(rawData);

  console.log(`📦 Se encontraron ${exercises.length} ejercicios`);

  // Mapear ejercicios al modelo de Prisma
  const mappedExercises = exercises.map((exercise) => {
    const mediaId = exercise.media_id || exercise.id;

    // Construir URLs de imágenes desde GitHub
    const imageUrl = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/${exercise.id}-${mediaId}.jpg`;
    const gifUrl = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/${exercise.id}-${mediaId}.gif`;

    // Instrucciones en español
    const instructionsEs = exercise.instructions?.es || null;

    return {
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      bodyPart: exercise.category, // Usar categoría como bodyPart
      equipment: exercise.equipment || 'Sin equipamiento',
      target: exercise.target || '',
      muscleGroup: exercise.muscle_group || '',
      secondaryMuscles: exercise.secondary_muscles || [],
      instructionsEs,
      imageUrl,
      gifUrl,
    };
  });

  // Insertar en lotes usando createMany con skipDuplicates
  const batchSize = 100;
  let created = 0;

  for (let i = 0; i < mappedExercises.length; i += batchSize) {
    const batch = mappedExercises.slice(i, i + batchSize);
    const result = await prisma.exercise.createMany({
      data: batch,
      skipDuplicates: true,
    });
    created += result.count;
    console.log(`  ✅ Lote ${Math.floor(i / batchSize) + 1}: ${result.count} ejercicios creados`);
  }

  console.log(`\n🎉 Seed completado: ${created} ejercicios insertados`);
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
