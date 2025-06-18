import React from 'react';

interface Props {
  onRun: () => void;
}

const OptimizationPanel: React.FC<Props> = ({ onRun }) => (
  <div className="p-4 border">
    <button onClick={onRun}>Run Optimization</button>
  </div>
);

export default OptimizationPanel;