import React from 'react';

const OptimizationStats: React.FC<{ stats: Record<string, number> }> = ({ stats }) => (
  <div className="text-sm space-y-1">
    {Object.entries(stats).map(([k, v]) => (
      <div key={k}>{k}: {v}</div>
    ))}
  </div>
);

export default OptimizationStats;