/**
 * Configuración de NextAuth.js
 * Proveedores: Credenciales (email + password) y Google OAuth
 */

import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    // Proveedor de Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // Proveedor de credenciales (email + contraseña)
    CredentialsProvider({
      name: 'Credenciales',
      credentials: {
        email: {
          label: 'Correo electrónico',
          type: 'email',
          placeholder: 'tu@email.com',
        },
        password: {
          label: 'Contraseña',
          type: 'password',
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Ingresa tu correo y contraseña');
        }

        // Buscar usuario por email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error('Credenciales inválidas');
        }

        // Verificar contraseña
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Credenciales inválidas');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
      }

      // Recalcular hasProfile en el sign-in inicial y cuando se solicite explícitamente
      // (ej. luego de completar el onboarding, vía update() del lado del cliente)
      if (user || trigger === 'update' || token.hasProfile === undefined) {
        const profile = await prisma.profile.findUnique({
          where: { userId: token.id as string },
          select: { id: true },
        });
        token.hasProfile = !!profile;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.hasProfile = token.hasProfile;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    newUser: '/auth/register',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
