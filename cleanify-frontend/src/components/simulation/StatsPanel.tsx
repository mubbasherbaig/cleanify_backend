import React from 'react';

const StatsPanel: React.FC<{ stats: Record<string, number> }> = ({ stats }) => (
  <div className="grid grid-cols-2 gap-2">
    {Object.entries(stats).map(([k, v]) => (
      <div key={k} className="text-sm">
        {k}: {v}
      </div>
    ))}
  </div>
);

export default StatsPanel;