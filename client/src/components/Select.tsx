import React from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export const Select: React.FC<Props> = ({ value, onChange, options, className = "" }) => (
  <select value={value} onChange={e => onChange(e.target.value)} className={`border p-2 rounded ${className}`}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);
