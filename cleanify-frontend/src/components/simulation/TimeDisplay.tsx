import React from 'react';

const TimeDisplay: React.FC<{ time: string }> = ({ time }) => (
  <span className="font-mono">{time}</span>
);

export default TimeDisplay;