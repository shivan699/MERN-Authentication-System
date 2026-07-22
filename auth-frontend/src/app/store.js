import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // localStorage under the hood
import authReducer from '../features/auth/authSlice';

const persistConfig = {
  key: 'auth',
  storage,
  // Only persist these fields — avoids accidentally persisting transient
  // UI state if the slice grows later.
  whitelist: ['user', 'accessToken', 'refreshToken', 'isAuthenticated'],
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
  },
  // redux-persist dispatches non-serializable actions internally;
  // this whitelist silences RTK's (otherwise correct) warning about them.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);