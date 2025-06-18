import React from 'react';

interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Array<{ value: string; label: string }>;
}

const Select: React.FC<Props> = ({ label, options, ...rest }) => (
  <label className="block text-sm">
    <span>{label}</span>
    <select className="border px-2" {...rest}>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </label>
);

export default Select;