import React from 'react';
import { Bin } from '@/types';

const BinMarker: React.FC<{ bin: Bin }> = ({ bin }) => (
  <div className="text-xs text-green-700">{bin.id}</div>
);

export default BinMarker;