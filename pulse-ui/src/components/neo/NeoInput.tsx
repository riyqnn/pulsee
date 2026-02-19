import type { InputHTMLAttributes } from 'react';

interface NeoInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const NeoInput = ({ label, className = '', ...props }: NeoInputProps) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block font-display font-bold text-lg mb-2">{label}</label>
      )}
      <input className={`input-neo ${className}`} {...props} />
    </div>
  );
};
