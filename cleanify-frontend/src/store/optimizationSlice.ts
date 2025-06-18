import { createSlice } from '@reduxjs/toolkit';

interface OptimizationState {
  running: boolean;
}

const initialState: OptimizationState = {
  running: false,
};

const optimizationSlice = createSlice({
  name: 'optimization',
  initialState,
  reducers: {
    setRunning(state, action) {
      state.running = action.payload;
    },
  },
});

export const { setRunning } = optimizationSlice.actions;
export default optimizationSlice.reducer;