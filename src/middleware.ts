import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Páginas públicas — redirigen a "/" si el usuario ya está autenticado
const PUBLIC_PAGES = ['/auth/login', '/auth/register'];

// Rutas que no requieren autenticación en absoluto (maquinaria de NextAuth)
const AUTH_BYPASS = ['/api/auth'];

// Rutas que no requieren perfil completado
const SKIP_PROFILE_CHECK = ['/onboarding', '/api/profile', '/api/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir assets estáticos y API de auth.
  // Nota: el chequeo de extensión de archivo se limita al FINAL del pathname
  // (no pathname.includes('.')) para que un segmento dinámico con un punto
  // (ej. un id malformado) no pueda saltarse la autenticación.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/manifest') ||
    /\.(png|jpg|jpeg|gif|svg|ico|webp|json|txt|xml|woff2?|css|js|map)$/i.test(pathname) ||
    AUTH_BYPASS.some((path) => pathname.startsWith(path))
  ) {
    return NextResponse.next();
  }

  // Verificar si es ruta pública
  const isPublic = PUBLIC_PAGES.some((path) => pathname.startsWith(path));

  // Obtener token de sesión
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Si no está autenticado y no es ruta pública → login.
  // Las rutas de API responden 401 JSON en vez de un redirect: un fetch()
  // del cliente seguiría el 302 hasta el HTML del login y el error real
  // (sesión expirada) quedaría enmascarado como un fallo de parseo.
  if (!token && !isPublic) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si está autenticado y va a login/register → dashboard
  if (token && isPublic) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Si está autenticado, verificar si tiene perfil. Solo aplica a páginas:
  // redirigir un fetch de API a /onboarding devolvería HTML donde el cliente
  // espera JSON (las rutas de API validan sesión por su cuenta).
  if (
    token &&
    !pathname.startsWith('/api') &&
    !SKIP_PROFILE_CHECK.some((path) => pathname.startsWith(path))
  ) {
    const hasProfile = token.hasProfile as boolean | undefined;

    if (hasProfile === false) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
