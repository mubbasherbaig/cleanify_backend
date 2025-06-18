import React from 'react';

interface Props {
  onStart: () => void;
  onStop: () => void;
}

const SimulationControls: React.FC<Props> = ({ onStart, onStop }) => (
  <div className="space-x-2">
    <button onClick={onStart}>Start</button>
    <button onClick={onStop}>Stop</button>
  </div>
);

export default SimulationControls;