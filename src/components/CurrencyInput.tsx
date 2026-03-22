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
  const displayValue = value === '' || value === 0 ? '' : `$ ${value.toLocaleString('es-AR')}`;

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
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      className={cn('tabular-nums', className)}
      required={required}
    />
  );
}
