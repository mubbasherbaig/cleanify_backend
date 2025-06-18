import React from 'react';
import { TruckRoute } from '@/types';

const RouteOverlay: React.FC<{ route: TruckRoute }> = () => (
  <svg className="absolute inset-0 pointer-events-none" />
);

export default RouteOverlay;