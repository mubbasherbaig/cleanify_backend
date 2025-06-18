import React from 'react';

interface Props {
  label: string;
}

const FormField: React.FC<Props> = ({ label, children }) => (
  <label className="block text-sm space-y-1">
    <span>{label}</span>
    {children}
  </label>
);

export default FormField;