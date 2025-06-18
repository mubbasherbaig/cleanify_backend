import React from 'react';

const EfficiencyMetrics: React.FC<{ metrics: Record<string, number> }> = ({ metrics }) => (
  <div className="text-sm space-y-1">
    {Object.entries(metrics).map(([k, v]) => (
      <div key={k}>{k}: {v}</div>
    ))}
  </div>
);

export default EfficiencyMetrics;