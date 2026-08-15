import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Estrategia de dark mode por clase (para next-themes)
  darkMode: 'class',
  theme: {
    extend: {
      // Tamaños de fuente para legibilidad móvil. Todos escalan con
      // --font-scale (ver globals.css) según la preferencia de tamaño de
      // letra del usuario (Perfil > Accesibilidad) — solo el texto crece,
      // no el espaciado/layout, para no romper la grilla mobile-first.
      fontSize: {
        'xs': ['calc(12px * var(--font-scale, 1))', { lineHeight: '1rem' }],
        'sm': ['calc(14px * var(--font-scale, 1))', { lineHeight: '1.25rem' }],
        'base': ['calc(16px * var(--font-scale, 1))', { lineHeight: '1.5rem' }],
        'body': ['calc(16px * var(--font-scale, 1))', { lineHeight: '1.5' }],
        'lg': ['calc(18px * var(--font-scale, 1))', { lineHeight: '1.5' }],
        'xl': ['calc(20px * var(--font-scale, 1))', { lineHeight: '1.4' }],
        '2xl': ['calc(24px * var(--font-scale, 1))', { lineHeight: '1.3' }],
        '3xl': ['calc(30px * var(--font-scale, 1))', { lineHeight: '1.2' }],
      },
      fontFamily: {
        sans: ['var(--font-body)', 'Inter', 'sans-serif'],
        display: ['var(--font-display)', "'Space Grotesk'", 'sans-serif'],
        mono: ['var(--font-label)', "'Space Mono'", 'monospace'],
      },
      colors: {
        // Paleta "The Charged Set" (ver DESIGN.md)
        volt: '#D4FF3D',
        'volt-bright': '#E4FF6B',
        moss: '#4E6B08',
        ink: {
          950: '#0E0F0C',
          900: '#17190F',
          border: '#262A1B',
          text: '#F3F5EA',
          muted: '#8B9078',
        },
        bone: {
          50: '#FAFAF2',
          card: '#FFFFFC',
          border: '#E4E4D6',
          text: '#14150F',
          muted: '#6B6E5C',
        },
        signal: {
          danger: '#FF5A4E',
        },

        // Tokens semánticos consumidos por los componentes shadcn/ui,
        // resueltos vía CSS variables (ver globals.css) para soportar tema claro/oscuro.
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          text: 'hsl(var(--accent-text))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      // Espaciado para touch targets mínimos de 48px
      spacing: {
        'touch': '48px',
        'touch-lg': '56px',
      },
      // Mínimos de altura para elementos interactivos
      minHeight: {
        'touch': '48px',
        'touch-lg': '56px',
      },
      // Border radius consistente con DESIGN.md (rounded.sm/md/lg/pill)
      borderRadius: {
        sm: '8px',
        md: 'var(--radius)', // 12px — botones, inputs, chips
        lg: '20px', // tarjetas
        xl: '28px',
      },
      boxShadow: {
        // La única sombra del sistema (The Glow, Not Gray Rule)
        'volt-glow': '0 0 0 3px rgba(212, 255, 61, 0.35)',
      },
      transitionTimingFunction: {
        'out-quint': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'pulse-once': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.15)', opacity: '0.7' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        // Único momento coreografiado fuera de las celebraciones (ver DESIGN.md § Rest Timer Ring)
        'pulse-once': 'pulse-once 300ms cubic-bezier(0.16, 1, 0.3, 1) 1',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('tailwindcss-animate'),
  ],
};

export default config;
