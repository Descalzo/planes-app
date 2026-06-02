import { useState } from 'react';

export interface AppSettings {
  notifMensajes: boolean;
  notifSolicitudes: boolean;
  notifConsultasPrivadas: boolean;
  mostrarEdad: boolean;
  mostrarInstagram: boolean;
  mostrarCiudad: boolean;
}

const STORAGE_KEY = 'planes-settings';

const DEFAULT_SETTINGS: AppSettings = {
  notifMensajes: true,
  notifSolicitudes: true,
  notifConsultasPrivadas: true,
  mostrarEdad: true,
  mostrarInstagram: true,
  mostrarCiudad: true,
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return { settings, updateSetting };
}
