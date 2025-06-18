import { useEffect, useState } from 'react';
import binsService from '@/services/binsService';

export default function useBins() {
  const [bins, setBins] = useState([]);

  useEffect(() => {
    binsService.getBins().then((res) => {
      if (res.success) setBins(res.data);
    });
  }, []);

  return bins;
}