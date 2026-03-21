import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value: number | '';
  onChange: (value: number | '') => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function CurrencyInput({ value, onChange, placeholder = 'Ingresá un monto', className, required }: CurrencyInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Block dots, commas, and other non-numeric characters except navigation keys
    if (['.', ',', 'e', 'E', '+'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      onChange('');
    } else {
      onChange(parseInt(raw, 10));
    }
  };

  return (
    <Input
      type="number"
      inputMode="numeric"
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={cn(className)}
      required={required}
      min={0}
      step={1}
    />
  );
}
