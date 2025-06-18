import { createSlice } from '@reduxjs/toolkit';
import { Bin } from '@/types';

interface BinsState {
  items: Bin[];
}

const initialState: BinsState = {
  items: [],
};

const binsSlice = createSlice({
  name: 'bins',
  initialState,
  reducers: {
    setBins(state, action) {
      state.items = action.payload;
    },
  },
});

export const { setBins } = binsSlice.actions;
export default binsSlice.reducer;