import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'predictix_auth_token';
const USER_KEY = 'predictix_auth_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
  });

  const login = (userData, authToken, rememberMe = false) => {
    setUser(userData);
    setToken(authToken);

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, authToken);
    storage.setItem(USER_KEY, JSON.stringify(userData));

    // Clear the other storage just in case
    const otherStorage = rememberMe ? sessionStorage : localStorage;
    otherStorage.removeItem(TOKEN_KEY);
    otherStorage.removeItem(USER_KEY);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '';
}
