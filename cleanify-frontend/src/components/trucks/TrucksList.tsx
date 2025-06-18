import React from 'react';
import { Truck } from '@/types';

const TrucksList: React.FC<{ trucks: Truck[] }> = ({ trucks }) => (
  <ul className="space-y-1">
    {trucks.map(t => (
      <li key={t.id}>{t.id}</li>
    ))}
  </ul>
);

export default TrucksList;