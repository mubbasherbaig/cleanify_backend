import React from 'react';
import { Truck } from '@/types';

const TruckMarker: React.FC<{ truck: Truck }> = ({ truck }) => (
  <div className="text-xs text-blue-700">{truck.id}</div>
);

export default TruckMarker;