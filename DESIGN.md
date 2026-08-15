---
name: GymApp
description: Tu entrenador personal con IA
colors:
  volt: "#D4FF3D"
  moss: "#4E6B08"
  ink-950: "#0E0F0C"
  ink-900: "#17190F"
  ink-border: "#262A1B"
  ink-text: "#F3F5EA"
  ink-text-muted: "#8B9078"
  bone-50: "#FAFAF2"
  bone-card: "#FFFFFC"
  bone-border: "#E4E4D6"
  bone-text: "#14150F"
  bone-text-muted: "#6B6E5C"
  signal-danger: "#FF5A4E"
typography:
  display:
    fontFamily: "'Space Grotesk', 'Archivo Black', sans-serif"
    fontSize: "clamp(2rem, 6vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.005em"
  title:
    fontFamily: "'Inter', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "'Inter', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Space Mono', monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.volt}"
    textColor: "{colors.ink-950}"
    rounded: "{rounded.md}"
    padding: "16px 24px"
    height: "56px"
  button-primary-hover:
    backgroundColor: "#E4FF6B"
    textColor: "{colors.ink-950}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.md}"
    height: "56px"
  chip-selected:
    backgroundColor: "{colors.volt}"
    textColor: "{colors.ink-950}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  chip-unselected:
    backgroundColor: "{colors.ink-900}"
    textColor: "{colors.ink-text-muted}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.ink-900}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.ink-900}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.md}"
    padding: "16px"
    height: "56px"
---

# Design System: GymApp

## 1. Overview

**Creative North Star: "The Charged Set"**

GymApp vive en la tensión entre dos cosas que casi ningún fitness app combina bien: la energía física cruda de entrenar y la precisión fría de un instrumento de medición. La identidad resuelve esa tensión con una superficie casi negra, cálida, silenciosa, sobre la que un único acento eléctrico — volt, un verde-lima que no existe en ningún otro fitness app — aparece únicamente en los momentos que importan: el botón que empieza la serie, el anillo del descanso corriendo, el badge de un PR. El resto de la superficie se queda callado a propósito para que el volt tenga peso cuando aparece.

Esto rechaza explícitamente dos caminos: el gym-bro agresivo de negro+rojo+calaveras (GymApp es intensa, no violenta), y el SaaS corporativo genérico de tarjetas idénticas y degradados grises (GymApp es precisa, no aséptica). El volt no es decoración, es la señal de "esto está pasando ahora": una serie activa, un descanso corriendo, un récord roto.

**Key Characteristics:**
- Un solo acento saturado (volt), nunca una paleta de colores compitiendo entre sí.
- Datos numéricos (peso, reps, tiempo) siempre en mono, nunca en la misma tipografía que la prosa.
- Fondo casi negro cálido como estado natural; el modo claro existe pero el volt se comporta distinto en él (ver Colors).
- Silencio visual entre series; explosión de movimiento solo en el momento de logro (PR, plan completado, racha).

## 2. Colors

Un único acento comprometido sobre neutros cálidos casi-negros (modo oscuro, el hogar natural de la marca) o casi-blancos (modo claro, funcional pero menos protagonista).

### Primary
- **Volt** (`#D4FF3D`, ≈ oklch(93% 0.24 128)): el acento eléctrico. Se usa como relleno de superficies grandes y deliberadas — CTA principal, anillo de descanso, badge de PR, barra de progreso activa — nunca como texto pequeño ni como decoración de fondo. Cubre entre 30-60% de las pantallas de momento-clave (timer activo, celebración de PR, plan completado); en pantallas de trabajo denso (listas, formularios) aparece solo en 1-2 puntos de acción.
- **Moss** (`#4E6B08`): la misma familia de matiz que Volt pero oscurecida y desaturada para uso como texto/ícono interactivo sobre fondos claros, donde el volt puro no tiene contraste suficiente. Nunca se usa como relleno grande; es la voz "silenciosa" del acento.

### Neutral (modo oscuro — hogar natural de la marca)
- **Ink 950** (`#0E0F0C`): fondo base. Casi negro, tibio, ligerísimamente verdoso — nunca `#000`.
- **Ink 900** (`#17190F`): superficie de tarjetas y elementos elevados un paso sobre el fondo.
- **Ink Border** (`#262A1B`): bordes y separadores, apenas perceptibles.
- **Ink Text** (`#F3F5EA`): texto principal. Casi blanco, tibio.
- **Ink Text Muted** (`#8B9078`): texto secundario, metadatos, timestamps.

### Neutral (modo claro — funcional, no protagonista)
- **Bone 50** (`#FAFAF2`): fondo base claro, tibio, nunca `#fff` puro.
- **Bone Card** (`#FFFFFC`): superficie de tarjetas.
- **Bone Border** (`#E4E4D6`): bordes.
- **Bone Text** (`#14150F`): texto principal.
- **Bone Text Muted** (`#6B6E5C`): texto secundario.

### Semántico
- **Signal Danger** (`#FF5A4E`): exclusivo para errores de formulario y validación. Un coral-rojo distinto en matiz del rojo agresivo de la estética gym-bro que se rechaza explícitamente; se usa solo funcionalmente, nunca decorativo.

### Named Rules
**The Fill, Not Ink Rule.** Volt es un color de relleno de formas y bloques, nunca de texto pequeño ni de íconos finos sobre fondo claro. Donde se necesite un acento textual sobre `bone-*`, usar Moss.

**The One Charge Rule.** Solo hay un acento saturado en todo el sistema. Si una pantalla necesita distinguir dos estados a la vez (ej. "completado" vs "en progreso"), se resuelve con opacidad/peso de Volt, no agregando un segundo color.

## 3. Typography

**Display Font:** Space Grotesk (con Archivo Black como fallback de máximo impacto)
**Body Font:** Inter
**Label/Mono Font:** Space Mono

**Character:** Space Grotesk aporta el peso geométrico y ligeramente técnico que hace sentir "audaz" sin caer en un póster deportivo genérico. Inter mantiene el cuerpo de texto silencioso y legible — es el fondo sobre el que Space Grotesk y Space Mono destacan. Space Mono convierte cada número (peso, reps, segundos) en un dato medido, no en una cifra decorativa: es la pieza que sostiene "precisa".

### Hierarchy
- **Display** (700, `clamp(2rem, 6vw, 3.5rem)`, line-height 1.05): nombre del plan generado, título de pantalla de celebración. Aparece pocas veces, siempre con peso.
- **Headline** (700, 1.75rem, line-height 1.15): título de día de entrenamiento, encabezados de sección.
- **Title** (600, 1.125rem — Inter): nombre de ejercicio dentro de una tarjeta, títulos de componentes.
- **Body** (400, 1rem, line-height 1.5 — Inter): texto corrido, instrucciones, notas. Máximo 65-75ch de ancho de línea.
- **Label** (500, 0.8125rem, letter-spacing 0.02em — Space Mono): **todo dato numérico sin excepción** — peso en kg, reps, segundos de descanso, series completadas, PRs, porcentajes de progreso.

### Named Rules
**The Measured Number Rule.** Ningún número de entrenamiento (peso, reps, tiempo, series) se muestra jamás en Inter o Space Grotesk. Si es una cifra que el usuario registró o que el sistema calculó, va en Space Mono. Esta es la línea visual que separa "dato" de "texto".

## 4. Elevation

El sistema es plano por defecto: la jerarquía entre fondo y tarjeta se resuelve con el paso tonal `ink-950 → ink-900` (o `bone-50 → bone-card`), no con sombras grises genéricas. La única sombra que existe en todo el sistema es un resplandor tintado de Volt, reservado exclusivamente para el estado activo/enfocado — nunca para indicar jerarquía estática.

### Shadow Vocabulary
- **Volt Focus Glow** (`box-shadow: 0 0 0 3px rgba(212, 255, 61, 0.35)`): foco de teclado en inputs, y borde del anillo de descanso mientras corre. Es la única sombra del sistema y es siempre volt, nunca gris.

### Named Rules
**The Glow, Not Gray Rule.** Prohibido usar `box-shadow` gris/negro ambient en cualquier componente. Si algo necesita "flotar", se resuelve con un paso tonal de fondo (ink-950→ink-900) o, si es un estado activo, con el Volt Focus Glow.

## 5. Components

### Buttons
- **Shape:** radio 12px (`rounded.md`), altura mínima 56px (objetivo táctil de gimnasio).
- **Primary:** fondo Volt (`#D4FF3D`), texto Ink 950 (nunca blanco sobre volt — el volt es demasiado claro). Peso de texto 700, Space Grotesk para CTAs cortos ("EMPEZAR", "SIGUIENTE SERIE").
- **Hover/Focus:** el fondo aclara a `#E4FF6B` y aparece el Volt Focus Glow; sin transform de escala, la superficie no "salta".
- **Ghost/Secondary:** fondo transparente, texto Ink Text, borde 1px Ink Border. Se usa para acciones secundarias ("Anterior", "Cancelar") — nunca lleva volt.

### Chips (filtros de ejercicios, selección de objetivo/nivel)
- **Style:** forma píldora (`rounded.pill`).
- **Selected:** fondo Volt sólido, texto Ink 950, peso 600.
- **Unselected:** fondo Ink 900, texto Ink Text Muted, sin borde.
- **State:** el cambio de seleccionado es instantáneo (150ms), sin rebote.

### Cards / Containers
- **Corner Style:** radio 20px (`rounded.lg`) — más redondeado que los botones, para diferenciar "contenedor de contenido" de "acción".
- **Background:** Ink 900 sobre Ink 950 (o Bone Card sobre Bone 50 en claro).
- **Shadow Strategy:** ninguna en reposo (ver Elevation). El paso tonal es la única señal de profundidad.
- **Border:** 1px Ink Border, casi invisible — está para separar, no para enmarcar.
- **Internal Padding:** 20px (`spacing.lg` ajustado).

### Inputs / Fields
- **Style:** fondo Ink 900, sin borde en reposo, radio 12px, altura 56px.
- **Focus:** Volt Focus Glow + borde 1px Volt. Es el único momento en que Volt aparece como línea, no como relleno.
- **Error:** borde 1px Signal Danger, mensaje debajo en Signal Danger, Space Mono si el error refiere a un valor numérico.

### Navigation (bottom nav)
- **Style:** fondo Ink 950 con blur sutil, 5 ítems máximo, íconos en Ink Text Muted.
- **Active state:** ícono y label pasan a Volt; el resto permanece apagado. No hay indicador de fondo ni pill detrás del ícono activo — el color solo ya comunica el estado.

### Rest Timer Ring (componente insignia)
El anillo de descanso circular es la pieza más visible de la marca en uso real: mientras corre, traza el Volt Focus Glow alrededor de un anillo que se vacía en sentido horario sobre fondo Ink 900, con el tiempo restante en el centro en Space Mono grande. Al llegar a cero, el anillo hace un único pulso de Volt (300ms) antes de desaparecer — el único momento de "choreographed motion" fuera de las celebraciones de logro.

## 6. Do's and Don'ts

### Do:
- **Do** usar Volt como relleno de superficies grandes y deliberadas (CTA, anillo de timer, badge de PR), nunca como texto pequeño.
- **Do** mostrar todo número de entrenamiento en Space Mono, sin excepción — es la regla que separa dato de texto.
- **Do** reservar el movimiento coreografiado (confetti, pulso del timer) para momentos de logro real: PR, plan completado, racha.
- **Do** mantener Ink 950/Bone 50 tibios y ligeramente verdosos — nunca `#000` ni `#fff` puros.
- **Do** resolver profundidad con pasos tonales (Ink 950→900), no con sombras grises.

### Don't:
- **Don't** usar la estética gym-bro agresiva: negro+rojo, calaveras, tipografía intimidante. GymApp es intensa, no violenta.
- **Don't** caer en el dashboard SaaS genérico: tarjetas idénticas, degradados decorativos, íconos gris-azulados sin personalidad.
- **Don't** usar un segundo color saturado "porque hace falta distinguir algo" — resolver con opacidad/peso de Volt (The One Charge Rule).
- **Don't** usar `border-left`/`border-right` de color como acento decorativo en tarjetas o alertas.
- **Don't** usar gradiente en texto (`background-clip: text`) para énfasis — el énfasis se resuelve con peso o tamaño.
- **Don't** agregar sombras grises/negras ambient en ningún componente — la única sombra del sistema es el Volt Focus Glow.
