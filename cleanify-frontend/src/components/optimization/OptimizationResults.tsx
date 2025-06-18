import React from 'react';

const OptimizationResults: React.FC<{ results: any }> = ({ results }) => (
  <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(results, null, 2)}</pre>
);

export default OptimizationResults;