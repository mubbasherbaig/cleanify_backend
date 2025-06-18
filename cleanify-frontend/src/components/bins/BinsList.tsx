import React from 'react';
import { Bin } from '@/types';

const BinsList: React.FC<{ bins: Bin[] }> = ({ bins }) => (
  <ul className="space-y-1">
    {bins.map(b => (
      <li key={b.id}>{b.id}</li>
    ))}
  </ul>
);

export default BinsList;