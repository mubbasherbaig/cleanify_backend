import React from 'react';

const SettingsProfiles: React.FC<{ profiles: string[]; onSelect: (p: string) => void }> = ({ profiles, onSelect }) => (
  <ul className="space-y-1">
    {profiles.map(p => (
      <li key={p}>
        <button onClick={() => onSelect(p)}>{p}</button>
      </li>
    ))}
  </ul>
);

export default SettingsProfiles;