import { useDispatch, useSelector } from 'react-redux';
import { RootState, optimizationActions } from '@/store';

export default function useOptimization() {
  const dispatch = useDispatch();
  const state = useSelector((s: RootState) => s.optimization);

  const toggle = () => dispatch(optimizationActions.setRunning(!state.running));

  return { ...state, toggle };
}