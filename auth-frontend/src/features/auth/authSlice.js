import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null, // { id, name, email, phone }
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Called after register->login, password login, email OTP login,
    // or phone OTP login — all of them return the same
    // { id, name, email, accessToken, refreshToken } shape.
    setCredentials: (state, action) => {
      const { accessToken, refreshToken, ...user } = action.payload;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.user = user;
      state.isAuthenticated = true;
    },
    // Called after a refresh-token rotation, to update tokens without
    // touching the stored user object.
    updateTokens: (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    logout: () => initialState,
  },
});

export const { setCredentials, updateTokens, logout } = authSlice.actions;
export default authSlice.reducer;