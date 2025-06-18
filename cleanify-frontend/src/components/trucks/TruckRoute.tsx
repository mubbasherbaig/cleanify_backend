import React from 'react';
import { TruckRoute as Route } from '@/types';

const TruckRoute: React.FC<{ route: Route }> = ({ route }) => (
  <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(route, null, 2)}</pre>
);

export default TruckRoute;