import { useEffect, useState } from 'react';
import trucksService from '@/services/trucksService';

export default function useTrucks() {
  const [trucks, setTrucks] = useState([]);

  useEffect(() => {
    trucksService.getTrucks().then((res) => {
      if (res.success) setTrucks(res.trucks);
    });
  }, []);

  return trucks;
}