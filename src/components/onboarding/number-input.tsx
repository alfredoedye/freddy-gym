'use client';

interface NumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberInput({
  label,
  value,
  onChange,
  unit,
  placeholder,
  min,
  max,
  step = 1,
}: NumberInputProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <label className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          className="h-16 w-32 rounded-md border border-transparent bg-secondary text-center font-mono text-3xl font-bold text-foreground outline-none transition-colors duration-150 ease-out-quint [appearance:textfield] focus-visible:border-primary focus-visible:shadow-volt-glow [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="ml-3 text-lg font-medium text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
