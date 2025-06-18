import { createSlice } from '@reduxjs/toolkit';
import { Truck } from '@/types';

interface TrucksState {
  items: Truck[];
}

const initialState: TrucksState = {
  items: [],
};

const trucksSlice = createSlice({
  name: 'trucks',
  initialState,
  reducers: {
    setTrucks(state, action) {
      state.items = action.payload;
    },
  },
});

export const { setTrucks } = trucksSlice.actions;
export default trucksSlice.reducer;