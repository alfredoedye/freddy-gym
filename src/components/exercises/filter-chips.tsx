'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface FilterChipsProps {
  options: { value: string; label: string }[];
  selected: string;
  onChange: (value: string) => void;
}

export function FilterChips({ options, selected, onChange }: FilterChipsProps) {
  return (
    <ToggleGroup
      type="single"
      value={selected}
      onValueChange={(value) => value && onChange(value)}
      className="flex-nowrap overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2"
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} className="flex-shrink-0">
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
