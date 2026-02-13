import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [countryCode, setCountryCode] = useState('US');
  const [subscriptions, setSubscriptions] = useState(['netflix', 'prime', 'disney']);

  const toggleSubscription = useCallback((platformId) => {
    setSubscriptions((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId],
    );
  }, []);

  const value = useMemo(
    () => ({
      countryCode,
      setCountryCode,
      subscriptions,
      toggleSubscription,
    }),
    [countryCode, subscriptions, toggleSubscription],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider.');
  }
  return context;
}
