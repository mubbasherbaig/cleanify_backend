import React from 'react';

const DepotMarker: React.FC<{ name: string }> = ({ name }) => (
  <div className="text-xs text-red-700 font-bold">{name}</div>
);

export default DepotMarker;