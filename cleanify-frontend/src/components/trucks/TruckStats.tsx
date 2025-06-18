import React from 'react';

const TruckStats: React.FC<{ stats: Record<string, number> }> = ({ stats }) => (
  <div className="space-y-1 text-sm">
    {Object.entries(stats).map(([k, v]) => (
      <div key={k}>{k}: {v}</div>
    ))}
  </div>
);

export default TruckStats;