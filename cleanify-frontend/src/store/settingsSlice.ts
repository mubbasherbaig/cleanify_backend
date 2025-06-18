import { createSlice } from '@reduxjs/toolkit';
import { AllSettings } from '@/types';

interface SettingsState {
  data: AllSettings | null;
}

const initialState: SettingsState = {
  data: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings(state, action) {
      state.data = action.payload;
    },
  },
});

export const { setSettings } = settingsSlice.actions;
export default settingsSlice.reducer;