import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, simulationActions } from '@/store';
import simulationService from '@/services/simulationService';

export default function useSimulation() {
  const dispatch = useDispatch();
  const state = useSelector((s: RootState) => s.simulation);

  useEffect(() => {
    simulationService.getStatus().then((res) => {
      if (res.success) {
        dispatch(simulationActions.updateFromSocket(res.status));
      }
    });
  }, [dispatch]);

  return state;
}