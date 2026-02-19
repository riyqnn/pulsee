import type { ChangeEvent } from 'react';

interface NeoToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export const NeoToggle = ({ checked, onChange, label }: NeoToggleProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <label className="flex items-center gap-4 cursor-pointer">
      <span className="font-display font-bold">{label}</span>
      <div className="toggle-neo">
        <input type="checkbox" checked={checked} onChange={handleChange} />
        <span className="toggle-slider"></span>
      </div>
    </label>
  );
};
