import React from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const DateTimePicker: React.FC<Props> = ({ label, ...rest }) => (
  <label className="block text-sm">
    <span>{label}</span>
    <input type="datetime-local" className="border px-2" {...rest} />
  </label>
);

export default DateTimePicker;