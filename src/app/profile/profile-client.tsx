'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';
import { LogOut, Loader2, Download, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useFontSize } from '@/components/providers/font-size-provider';
import { useInstallPrompt } from '@/components/providers/install-prompt-provider';
import { calculateAge } from '@/lib/date-utils';
import {
  GOALS,
  LEVELS,
  SEXES,
  FONT_SIZES,
  type Goal,
  type Level,
  type Sex,
  type FontSize,
} from '@/lib/profile-options';

interface ProfileData {
  birthDate: string;
  sex: Sex | null;
  height: string;
  weight: string;
  goal: Goal;
  level: Level;
  fontSize: FontSize;
}

interface ProfileClientProps {
  name: string;
  email: string;
  profile: ProfileData | null;
}

// Rango de fechas válido para el date picker (14 a 80 años)
const today = new Date();
const MAX_BIRTH_DATE = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate())
  .toISOString()
  .split('T')[0];
const MIN_BIRTH_DATE = new Date(today.getFullYear() - 80, today.getMonth(), today.getDate())
  .toISOString()
  .split('T')[0];

export function ProfileClient({ name: initialName, email, profile }: ProfileClientProps) {
  const [name, setName] = useState(initialName);
  const [birthDate, setBirthDate] = useState(profile?.birthDate || '');
  const [height, setHeight] = useState(profile?.height || '');
  const [weight, setWeight] = useState(profile?.weight || '');
  const [sex, setSex] = useState<Sex | null>(profile?.sex || null);
  const [goal, setGoal] = useState<Goal | null>(profile?.goal || null);
  const [level, setLevel] = useState<Level | null>(profile?.level || null);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [installing, setInstalling] = useState(false);
  const { fontSize, setFontSize } = useFontSize();
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();

  const age = birthDate ? calculateAge(new Date(birthDate)) : null;
  const isValid =
    name.trim().length >= 2 &&
    birthDate !== '' &&
    age !== null &&
    age >= 14 &&
    age <= 80 &&
    height !== '' &&
    weight !== '' &&
    sex !== null &&
    goal !== null &&
    level !== null;

  const handleSave = async () => {
    if (!isValid || !sex || !goal || !level) return;

    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          birthDate,
          sex,
          height: parseFloat(height),
          weight: parseFloat(weight),
          goal,
          level,
        }),
      });

      if (!res.ok) throw new Error('Error al guardar');

      toast.success('Perfil actualizado');
    } catch {
      toast.error('No se pudo guardar el perfil. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleFontSizeChange = async (value: FontSize) => {
    const previous = fontSize;
    setFontSize(value); // aplicar de inmediato en toda la app

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fontSize: value }),
      });

      if (!res.ok) throw new Error('Error al guardar');
    } catch {
      setFontSize(previous);
      toast.error('No se pudo guardar el tamaño de letra. Intentá de nuevo.');
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ callbackUrl: '/auth/login' });
  };

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'accepted') toast.success('¡GymApp instalada!');
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-5 pt-8 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary">
            <span className="font-display text-xl font-bold text-primary-foreground">
              {name ? name.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">{name || 'Atleta'}</h1>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <div className="px-4 space-y-8">
        {/* Datos personales */}
        <section className="space-y-4">
          <h2 className="font-display text-lg font-bold text-foreground">Tu perfil</h2>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Fecha de nacimiento</Label>
              <input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                min={MIN_BIRTH_DATE}
                max={MAX_BIRTH_DATE}
                className="flex h-14 w-full rounded-md border border-transparent bg-secondary px-4 font-mono text-sm text-foreground outline-none transition-colors duration-150 ease-out-quint focus-visible:border-primary focus-visible:shadow-volt-glow"
              />
            </div>
            <div className="space-y-2">
              <Label>Edad</Label>
              <div className="flex h-14 items-center rounded-md bg-secondary px-4 font-mono text-lg text-muted-foreground">
                {age !== null ? `${age} años` : '—'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="height">Altura (cm)</Label>
              <Input
                id="height"
                type="number"
                inputMode="decimal"
                min={100}
                max={230}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                inputMode="decimal"
                step={0.5}
                min={30}
                max={200}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sexo</Label>
            <ToggleGroup
              type="single"
              value={sex || undefined}
              onValueChange={(value) => value && setSex(value as Sex)}
            >
              {SEXES.map((s) => (
                <ToggleGroupItem key={s.value} value={s.value}>
                  {s.icon} {s.title}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label>Objetivo</Label>
            <ToggleGroup
              type="single"
              value={goal || undefined}
              onValueChange={(value) => value && setGoal(value as Goal)}
            >
              {GOALS.map((g) => (
                <ToggleGroupItem key={g.value} value={g.value}>
                  {g.icon} {g.title}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label>Nivel</Label>
            <ToggleGroup
              type="single"
              value={level || undefined}
              onValueChange={(value) => value && setLevel(value as Level)}
            >
              {LEVELS.map((l) => (
                <ToggleGroupItem key={l.value} value={l.value}>
                  {l.icon} {l.title}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Button onClick={handleSave} disabled={!isValid || saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar cambios'
            )}
          </Button>
        </section>

        {/* Accesibilidad */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-foreground">Accesibilidad</h2>
          <div className="space-y-2">
            <Label>Tamaño de letra</Label>
            <ToggleGroup
              type="single"
              value={fontSize}
              onValueChange={(value) => value && handleFontSizeChange(value as FontSize)}
            >
              {FONT_SIZES.map((f) => (
                <ToggleGroupItem key={f.value} value={f.value} className="flex-col gap-1 py-2">
                  <span
                    className={
                      f.value === 'NORMAL'
                        ? 'text-base'
                        : f.value === 'LARGE'
                          ? 'text-lg'
                          : 'text-xl'
                    }
                  >
                    {f.icon}
                  </span>
                  <span className="text-xs">{f.title}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-sm text-muted-foreground">
              Aumenta el tamaño del texto en toda la app para que sea más fácil de leer.
            </p>
          </div>
        </section>

        {/* Instalar app */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-foreground">Instalar app</h2>

          {isInstalled ? (
            <p className="text-sm text-muted-foreground">
              Ya tenés GymApp instalada en este dispositivo. ✓
            </p>
          ) : canInstall ? (
            <>
              <Button onClick={handleInstall} disabled={installing} className="w-full">
                {installing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Instalar app
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                Se agrega a tu pantalla de inicio y abre como una app, sin la barra del navegador.
              </p>
            </>
          ) : (
            <div className="space-y-3 rounded-md bg-secondary p-4">
              <p className="text-sm text-muted-foreground">
                Si no te apareció el aviso para instalarla, agregala manualmente:
              </p>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">iPhone (Safari)</p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  Tocá <Share className="h-4 w-4 shrink-0" /> Compartir → &quot;Agregar a
                  pantalla de inicio&quot;
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Android (Chrome)</p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  Tocá el menú ⋮ → &quot;Instalar app&quot; (o{' '}
                  <Plus className="h-4 w-4 shrink-0" /> &quot;Agregar a pantalla de inicio&quot;)
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Cuenta */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-foreground">Cuenta</h2>
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            {signingOut ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <LogOut className="h-5 w-5" />
                Cerrar sesión
              </>
            )}
          </Button>
        </section>
      </div>
    </div>
  );
}
