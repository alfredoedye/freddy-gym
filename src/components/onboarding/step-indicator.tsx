'use client';

interface StepIndicatorProps {
  totalSteps: number;
  currentStep: number;
}

export function StepIndicator({ totalSteps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ease-out-quint ${
            i === currentStep ? 'w-8 bg-primary' : i < currentStep ? 'w-2 bg-primary/50' : 'w-2 bg-secondary'
          }`}
        />
      ))}
    </div>
  );
}
