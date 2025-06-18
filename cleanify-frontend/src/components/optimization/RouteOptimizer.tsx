import React from 'react';

interface Props {
  onOptimize: () => void;
}

const RouteOptimizer: React.FC<Props> = ({ onOptimize }) => (
  <button onClick={onOptimize}>Optimize Routes</button>
);

export default RouteOptimizer;