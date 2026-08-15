/**
 * Script para crear un usuario inicial
 * Ejecutar: EMAIL=tu@email.com NAME="Tu Nombre" PASSWORD=tuPassword npx tsx scripts/create-user.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.EMAIL;
  const name = process.env.NAME;
  const password = process.env.PASSWORD;

  if (!email || !name || !password) {
    console.error('❌ Faltan variables de entorno. Uso:');
    console.error('   EMAIL=tu@email.com NAME="Tu Nombre" PASSWORD=tuPassword npx tsx scripts/create-user.ts');
    process.exit(1);
  }

  // Verificar si ya existe
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('⚠️  El usuario ya existe:', existing.email);
    return;
  }

  // Hashear password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Crear usuario
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
    },
  });

  console.log('✅ Usuario creado exitosamente:');
  console.log(`   Email: ${user.email}`);
  console.log(`   Nombre: ${user.name}`);
  console.log(`   ID: ${user.id}`);
  console.log(`\n   Password: ${password}`);
  console.log('   (Cambialo después si querés)');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
