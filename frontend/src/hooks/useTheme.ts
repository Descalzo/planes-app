import { useEffect, useState } from 'react';

export type ThemePreference = 'auto' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

function resolveTheme(pref: ThemePreference): Theme {
  if (pref === 'auto') {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }
  return pref;
}

function getInitialPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem('planes-theme-pref');
    if (saved === 'auto' || saved === 'light' || saved === 'dark') return saved;
    const legacy = localStorage.getItem('planes-theme');
    if (legacy === 'light' || legacy === 'dark') return legacy;
    return 'auto';
  } catch {
    return 'auto';
  }
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(getInitialPreference);
  const theme = resolveTheme(preference);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('planes-theme-pref', preference);
      localStorage.setItem('planes-theme', theme);
    } catch {}
  }, [theme, preference]);

  function setPreference(pref: ThemePreference) {
    setPreferenceState(pref);
  }

  function toggleTheme() {
    setPreferenceState((p) => (p === 'dark' ? 'light' : 'dark'));
  }

  return { theme, preference, setPreference, toggleTheme };
}
