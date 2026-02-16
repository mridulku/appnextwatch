import React, { createContext, useContext, useMemo, useState } from 'react';

import { USERS } from '../data/seeds/users';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = (username, password) => {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedUsername || !normalizedPassword) {
      return { ok: false, message: 'Enter your username and password.' };
    }

    const match = USERS.find(
      (record) =>
        record.username.toLowerCase() === normalizedUsername &&
        record.password === normalizedPassword,
    );

    if (!match) {
      return { ok: false, message: 'That username or password is not valid.' };
    }

    setUser({ id: match.id, name: match.name, username: match.username });
    return { ok: true };
  };

  const logout = () => setUser(null);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
