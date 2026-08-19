'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { StepIndicator } from '@/components/onboarding/step-indicator';
import { GoalCard } from '@/components/onboarding/goal-card';
import { NumberInput } from '@/components/onboarding/number-input';
import { calculateAge } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  GOALS,
  LEVELS,
  SEXES,
  isHeightValid,
  isWeightValid,
  type Goal,
  type Level,
  type Sex,
} from '@/lib/profile-options';

// Rango de fechas válido para el date picker (14 a 80 años)
const today = new Date();
const MAX_BIRTH_DATE = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate())
  .toISOString()
  .split('T')[0];
const MIN_BIRTH_DATE = new Date(today.getFullYear() - 80, today.getMonth(), today.getDate())
  .toISOString()
  .split('T')[0];

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<Level | null>(null);

  // Validation
  const isStepValid = useCallback(() => {
    switch (step) {
      case 0:
        return name.trim().length >= 2;
      case 1: {
        if (birthDate === '') return false;
        const age = calculateAge(new Date(birthDate));
        return age >= 14 && age <= 80 && isHeightValid(height) && isWeightValid(weight);
      }
      case 2:
        return sex !== null;
      case 3:
        return goal !== null;
      case 4:
        return level !== null;
      default:
        return false;
    }
  }, [step, name, birthDate, height, weight, sex, goal, level]);

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!goal || !level || !sex) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
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

      if (!response.ok) {
        throw new Error('Error al guardar perfil');
      }

      // Refrescar el JWT para que hasProfile pase a true y el middleware deje de redirigir aquí
      await update();

      // Mostrar celebración brevemente
      setShowConfetti(true);
      setTimeout(() => {
        router.push('/plan/create');
      }, 1500);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Hubo un error al guardar tu perfil. Intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-6 py-8 relative overflow-hidden">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="text-center animate-bounce">
            <p className="text-6xl mb-4">🎉</p>
            <p className="font-display text-2xl font-bold text-foreground">¡Perfil creado!</p>
            <p className="text-lg text-muted-foreground mt-2">Vamos a armar tu plan...</p>
          </div>
        </div>
      )}

      {/* Header con indicador de progreso */}
      <div className="flex-shrink-0">
        <StepIndicator totalSteps={TOTAL_STEPS} currentStep={step} />
        <p className="text-center text-sm font-mono text-muted-foreground mt-1">
          Paso {step + 1} de {TOTAL_STEPS}
        </p>
      </div>

      {/* Contenido del paso actual */}
      <div className="flex-1 flex flex-col justify-center py-8">
        <div
          className="transition-all duration-300 ease-in-out"
          key={step}
        >
          {/* Step 0: Nombre */}
          {step === 0 && (
            <div className="space-y-6 text-center">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">
                  ¡Hola! 👋
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  ¿Cómo te llamás?
                </p>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoFocus
                className="w-full h-14 rounded-md border border-transparent bg-secondary text-center text-xl font-semibold text-foreground outline-none transition-colors duration-150 ease-out-quint placeholder:text-muted-foreground focus-visible:border-primary focus-visible:shadow-volt-glow"
              />
            </div>
          )}

          {/* Step 1: Datos físicos */}
          {step === 1 && (
            <div className="space-y-6 text-center">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">
                  Tus datos 📊
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Esto nos ayuda a personalizar tu plan
                </p>
              </div>
              <div className="flex flex-col items-center gap-6 pt-4">
                <div className="flex flex-col items-center gap-2">
                  <label className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    min={MIN_BIRTH_DATE}
                    max={MAX_BIRTH_DATE}
                    className="h-16 rounded-md border border-transparent bg-secondary px-4 text-center font-mono text-xl font-semibold text-foreground outline-none transition-colors duration-150 ease-out-quint focus-visible:border-primary focus-visible:shadow-volt-glow"
                  />
                </div>
                <NumberInput
                  label="Altura"
                  value={height}
                  onChange={setHeight}
                  unit="cm"
                  placeholder="175"
                  min={100}
                  max={230}
                  invalid={height !== '' && !isHeightValid(height)}
                />
                <NumberInput
                  label="Peso"
                  value={weight}
                  onChange={setWeight}
                  unit="kg"
                  placeholder="80"
                  min={30}
                  max={200}
                  step={0.5}
                  invalid={weight !== '' && !isWeightValid(weight)}
                />
              </div>
            </div>
          )}

          {/* Step 2: Sexo */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="font-display text-3xl font-bold text-foreground">
                  Tu sexo ⚧
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Nos ayuda a calibrar mejor tu plan
                </p>
              </div>
              <div className="space-y-3 pt-2">
                {SEXES.map((s) => (
                  <GoalCard
                    key={s.value}
                    icon={s.icon}
                    title={s.title}
                    description={s.description}
                    selected={sex === s.value}
                    onClick={() => setSex(s.value)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Objetivo */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="font-display text-3xl font-bold text-foreground">
                  Tu objetivo 🎯
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  ¿Qué querés lograr?
                </p>
              </div>
              <div className="space-y-3 pt-2">
                {GOALS.map((g) => (
                  <GoalCard
                    key={g.value}
                    icon={g.icon}
                    title={g.title}
                    description={g.description}
                    selected={goal === g.value}
                    onClick={() => setGoal(g.value)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Nivel */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="font-display text-3xl font-bold text-foreground">
                  Tu experiencia 🏋️
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  ¿Cuánto tiempo llevás entrenando?
                </p>
              </div>
              <div className="space-y-3 pt-2">
                {LEVELS.map((l) => (
                  <GoalCard
                    key={l.value}
                    icon={l.icon}
                    title={l.title}
                    description={l.description}
                    selected={level === l.value}
                    onClick={() => setLevel(l.value)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botones de navegación */}
      <div className="flex-shrink-0 flex gap-3 pt-4 pb-safe">
        {step > 0 && (
          <Button type="button" variant="outline" onClick={handlePrev} className="flex-1">
            Anterior
          </Button>
        )}
        {step < TOTAL_STEPS - 1 ? (
          <Button type="button" onClick={handleNext} disabled={!isStepValid()} className="flex-1">
            Siguiente
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isStepValid() || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Guardando...
              </>
            ) : (
              'Completar ✨'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
