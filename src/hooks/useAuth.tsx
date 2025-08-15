import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import type { User, AuthContextType } from '../types';
import { api, ApiError } from '../utils/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; user: User; token: string }
  | { type: 'LOGIN_FAILURE'; error: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; user: User }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: true,
  error: null,
};

const AuthContext = createContext<AuthContextType | null>(null);

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        user: action.user, 
        token: action.token, 
        isLoading: false, 
        error: null 
      };
    case 'LOGIN_FAILURE':
      return { 
        ...state, 
        user: null, 
        token: null, 
        isLoading: false, 
        error: action.error 
      };
    case 'LOGOUT':
      return { 
        ...state, 
        user: null, 
        token: null, 
        isLoading: false, 
        error: null 
      };
    case 'UPDATE_USER':
      return { ...state, user: action.user };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

// Token storage utilities
const TOKEN_KEY = 'seafood_auth_token';

function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for stored token on app load
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getStoredToken();
      
      if (!storedToken) {
        dispatch({ type: 'SET_LOADING', loading: false });
        return;
      }

      try {
        const result = await api.auth.getCurrentUser(storedToken);
        dispatch({ 
          type: 'LOGIN_SUCCESS', 
          user: result.user, 
          token: storedToken 
        });
      } catch (error) {
        console.error('Auto-login failed:', error);
        removeToken();
        dispatch({ type: 'LOGOUT' });
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const result = await api.auth.login(email, password);
      
      saveToken(result.token);
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        user: result.user, 
        token: result.token 
      });

      console.log(`Logged in as ${result.user.name} (${result.user.role})`);
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Login failed. Please try again.';
      
      dispatch({ type: 'LOGIN_FAILURE', error: errorMessage });
      throw error;
    }
  };

  const logout = async () => {
    if (state.token) {
      try {
        await api.auth.logout(state.token);
      } catch (error) {
        console.error('Logout API call failed:', error);
        // Continue with logout even if API call fails
      }
    }

    removeToken();
    dispatch({ type: 'LOGOUT' });
    console.log('Logged out successfully');
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!state.token) {
      throw new Error('Not authenticated');
    }

    try {
      const result = await api.auth.updateProfile(state.token, updates);
      dispatch({ type: 'UPDATE_USER', user: result.user });
      console.log('Profile updated successfully');
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Profile update failed. Please try again.';
      throw new Error(errorMessage);
    }
  };

  const contextValue: AuthContextType = {
    user: state.user,
    token: state.token,
    login,
    logout,
    updateProfile,
    isLoading: state.isLoading,
    isAuthenticated: !!state.user && !!state.token,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}