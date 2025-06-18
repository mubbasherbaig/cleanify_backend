import React from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const NumberInput: React.FC<Props> = ({ label, ...rest }) => (
  <label className="block text-sm">
    <span>{label}</span>
    <input type="number" className="border px-2" {...rest} />
  </label>
);

export default NumberInput;