import React from 'react';

const SettingsPanel: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <div className="p-4 space-y-2">{children}</div>
);

export default SettingsPanel;