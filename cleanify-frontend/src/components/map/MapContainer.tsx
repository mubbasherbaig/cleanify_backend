import React from 'react';

const MapContainer: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <div className="h-full w-full bg-gray-200">{children}</div>
);

export default MapContainer;