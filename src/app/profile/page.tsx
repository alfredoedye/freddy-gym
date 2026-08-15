import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProfileClient } from './profile-client';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  const [user, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    }),
    prisma.profile.findUnique({ where: { userId: session.user.id } }),
  ]);

  return (
    <ProfileClient
      name={user?.name || ''}
      email={user?.email || ''}
      profile={
        profile
          ? {
              birthDate: profile.birthDate ? profile.birthDate.toISOString().split('T')[0] : '',
              sex: profile.sex,
              height: profile.height?.toString() || '',
              weight: profile.weight?.toString() || '',
              goal: profile.goal,
              level: profile.level,
            }
          : null
      }
    />
  );
}
