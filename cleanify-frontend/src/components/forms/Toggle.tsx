import React from 'react';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Toggle: React.FC<Props> = ({ checked, onChange }) => (
  <label className="flex items-center space-x-2">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    <span>{checked ? 'On' : 'Off'}</span>
  </label>
);

export default Toggle;