import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk, Space_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { SessionProvider } from '@/components/providers/session-provider';
import { RegisterServiceWorker } from '@/components/providers/register-service-worker';
import { AppShell } from '@/components/layout/app-shell';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', weight: ['500', '700'] });
const spaceMono = Space_Mono({ subsets: ['latin'], variable: '--font-label', weight: ['400', '700'] });

export const metadata: Metadata = {
  title: 'GymApp - Tu Entrenador Personal',
  description: 'Aplicación de entrenamiento personalizado con IA',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GymApp',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF2' },
    { media: '(prefers-color-scheme: dark)', color: '#0E0F0C' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn(inter.variable, spaceGrotesk.variable, spaceMono.variable)}
    >
      <body className="font-sans text-body antialiased">
        <RegisterServiceWorker />
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <AppShell>{children}</AppShell>
            <Toaster position="top-center" />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
